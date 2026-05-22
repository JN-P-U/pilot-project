package com.practice.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "회원 등록 요청")
public record MemberCreateRequest(
        @Schema(description = "이메일", example = "hong@example.com")
        @NotBlank @Email
        String email,

        @Schema(description = "이름 (2~20자)", example = "홍길동")
        @NotBlank @Size(min = 2, max = 20)
        String name,

        @Schema(description = "비밀번호 (최소 4자)", example = "1234")
        @NotBlank @Size(min = 4)
        String password
) {}
