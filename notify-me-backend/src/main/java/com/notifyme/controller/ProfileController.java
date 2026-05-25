package com.notifyme.controller;

import com.notifyme.dto.response.ApiResponse;
import com.notifyme.dto.response.UserResponse;
import com.notifyme.exception.ResourceNotFoundException;
import com.notifyme.model.User;
import com.notifyme.repository.UserRepository;
import com.notifyme.security.SecurityUtils;
import com.notifyme.service.AuthService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> getProfile() {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(ApiResponse.success(authService.mapToUserResponse(user)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getSmartSuggestionsEnabled() != null)
            user.setSmartSuggestionsEnabled(request.getSmartSuggestionsEnabled());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(authService.mapToUserResponse(user)));
    }

    @PutMapping("/timezone")
    public ResponseEntity<ApiResponse<UserResponse>> updateTimezone(@RequestBody TimezoneRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setTimezone(request.getTimezone());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(authService.mapToUserResponse(user)));
    }

    @PutMapping("/fcm-token")
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(@RequestBody FcmTokenRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        userRepository.updateFcmToken(userId, request.getFcmToken());
        return ResponseEntity.ok(ApiResponse.success("FCM token updated", null));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@RequestBody ChangePasswordRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current password is incorrect"));
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private Boolean smartSuggestionsEnabled;
    }

    @Data
    public static class TimezoneRequest {
        @NotBlank
        private String timezone;
    }

    @Data
    public static class FcmTokenRequest {
        @NotBlank
        private String fcmToken;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;
        @NotBlank
        private String newPassword;
    }
}
