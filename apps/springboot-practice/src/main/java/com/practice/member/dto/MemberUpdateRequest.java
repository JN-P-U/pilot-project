package com.practice.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "회원 수정 요청 (변경할 항목만 포함)")
public record MemberUpdateRequest(
        @Schema(description = "이름 (2~20자)", example = "홍길순")
        @Size(min = 2, max = 20)
        String name,

        @Schema(description = "비밀번호 (최소 4자)", example = "5678")
        @Size(min = 4)
        String password
) {}
