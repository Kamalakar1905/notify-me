package com.notifyme.dto.response;

import com.notifyme.model.enums.AuthProvider;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String mobileNumber;
    private String fullName;
    private AuthProvider authProvider;
    private String timezone;
    private Boolean isEmailVerified;
    private Boolean isMobileVerified;
    private Boolean smartSuggestionsEnabled;
    private Instant createdAt;
    private Instant lastLoginAt;
}
