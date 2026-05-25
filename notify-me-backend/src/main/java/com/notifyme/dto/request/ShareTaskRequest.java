package com.notifyme.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShareTaskRequest {
    @NotBlank(message = "Email or mobile number is required")
    private String emailOrMobile;
}
