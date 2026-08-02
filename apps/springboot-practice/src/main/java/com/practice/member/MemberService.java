package com.practice.member;

import com.practice.member.dto.MemberCreateRequest;
import com.practice.member.dto.MemberResponse;
import com.practice.member.dto.MemberUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

    @Transactional
    public MemberResponse create(MemberCreateRequest request) {
        if (memberRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + request.email());
        }
        Member member = Member.builder()
                .email(request.email())
                .name(request.name())
                .password(request.password())
                .build();
        return MemberResponse.from(memberRepository.save(member));
    }

    public MemberResponse findById(Long id) {
        return MemberResponse.from(getMemberOrThrow(id));
    }

    public List<MemberResponse> findAll() {
        return memberRepository.findAll().stream()
                .map(MemberResponse::from)
                .toList();
    }

    @Transactional
    public MemberResponse update(Long id, MemberUpdateRequest request) {
        Member member = getMemberOrThrow(id);
        member.update(request.name(), request.password());
        return MemberResponse.from(member);
    }

    @Transactional
    public void delete(Long id) {
        Member member = getMemberOrThrow(id);
        memberRepository.delete(member);
    }

    private Member getMemberOrThrow(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다: " + id));
    }
}
