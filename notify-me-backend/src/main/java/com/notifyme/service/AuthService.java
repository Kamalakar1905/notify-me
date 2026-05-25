package com.notifyme.service;

import com.notifyme.dto.request.*;
import com.notifyme.dto.response.AuthResponse;
import com.notifyme.dto.response.UserResponse;
import com.notifyme.exception.BadRequestException;
import com.notifyme.exception.UnauthorizedException;
import com.notifyme.model.OtpRecord;
import com.notifyme.model.RefreshToken;
import com.notifyme.model.User;
import com.notifyme.model.enums.AuthProvider;
import com.notifyme.model.enums.OtpPurpose;
import com.notifyme.repository.OtpRepository;
import com.notifyme.repository.RefreshTokenRepository;
import com.notifyme.repository.UserRepository;
import com.notifyme.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpRepository otpRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${jwt.access-token-expiry}")
    private long accessTokenExpiry;

    @Value("${otp.expiry-minutes}")
    private int otpExpiryMinutes;

    @Value("${otp.length}")
    private int otpLength;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .authProvider(AuthProvider.EMAIL)
                .timezone(request.getTimezone())
                .build();
        user = userRepository.save(user);
        return buildAuthResponse(user);
    }

    public AuthResponse loginWithEmail(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }
        userRepository.updateLastLogin(user.getId());
        return buildAuthResponse(user);
    }

    public void sendOtp(OtpRequest request) {
        String identifier = request.getIdentifier();
        // Invalidate previous OTPs
        otpRepository.invalidateAll(identifier, OtpPurpose.LOGIN);

        String otp = generateOtp();
        OtpRecord record = OtpRecord.builder()
                .identifier(identifier)
                .otpHash(passwordEncoder.encode(otp))
                .purpose(OtpPurpose.LOGIN)
                .expiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                .build();
        otpRepository.save(record);

        // Send via email or SMS based on identifier format
        if (identifier.contains("@")) {
            emailService.sendOtp(identifier, otp);
        } else {
            log.info("SMS OTP for {}: {} (SMS service not configured)", identifier, otp);
        }
    }

    public AuthResponse verifyOtp(OtpVerifyRequest request) {
        OtpRecord record = otpRepository
                .findTopByIdentifierAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        request.getIdentifier(), OtpPurpose.LOGIN)
                .orElseThrow(() -> new BadRequestException("No active OTP found"));

        if (record.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("OTP has expired");
        }
        if (record.getAttempts() >= 3) {
            throw new BadRequestException("Too many failed attempts");
        }
        if (!passwordEncoder.matches(request.getOtp(), record.getOtpHash())) {
            record.setAttempts(record.getAttempts() + 1);
            otpRepository.save(record);
            throw new BadRequestException("Invalid OTP");
        }

        record.setUsed(true);
        otpRepository.save(record);

        // Find or create user
        User user = userRepository.findByEmail(request.getIdentifier())
                .or(() -> userRepository.findByMobileNumber(request.getIdentifier()))
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .fullName("User")
                            .authProvider(AuthProvider.OTP)
                            .build();
                    if (request.getIdentifier().contains("@")) {
                        newUser.setEmail(request.getIdentifier());
                    } else {
                        newUser.setMobileNumber(request.getIdentifier());
                    }
                    return userRepository.save(newUser);
                });

        userRepository.updateLastLogin(user.getId());
        return buildAuthResponse(user);
    }

    public AuthResponse loginWithGoogle(String googleIdToken) {
        // In production, verify the token with Google's API
        // For now, we parse the token and find/create user
        throw new UnsupportedOperationException("Google login requires Google API client configuration");
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid refresh token");
        }
        UUID userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        String tokenHash = hashToken(refreshToken);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Refresh token not found"));

        if (stored.getRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Rotate refresh token
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return buildAuthResponse(user);
    }

    public void logout(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        RefreshToken tokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(refreshToken))
                .expiresAt(Instant.now().plusMillis(604800000L))
                .build();
        refreshTokenRepository.save(tokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiry / 1000)
                .user(mapToUserResponse(user))
                .build();
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private String hashToken(String token) {
        return Integer.toHexString(token.hashCode()) + token.substring(token.length() - 8);
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .mobileNumber(user.getMobileNumber())
                .fullName(user.getFullName())
                .authProvider(user.getAuthProvider())
                .timezone(user.getTimezone())
                .isEmailVerified(user.getIsEmailVerified())
                .isMobileVerified(user.getIsMobileVerified())
                .smartSuggestionsEnabled(user.getSmartSuggestionsEnabled())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
