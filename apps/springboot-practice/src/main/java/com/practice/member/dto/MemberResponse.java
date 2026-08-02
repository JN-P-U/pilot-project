package com.practice.member.dto;

import com.practice.member.Member;
import com.practice.member.MemberRole;

import java.time.LocalDateTime;

public record MemberResponse(
        Long id,
        String email,
        String name,
        MemberRole role,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getRole(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }
}
