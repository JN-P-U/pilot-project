package com.practice.member;

import com.practice.member.dto.MemberCreateRequest;
import com.practice.member.dto.MemberResponse;
import com.practice.member.dto.MemberUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
@Tag(name = "회원 관리", description = "회원 CRUD API")
public class MemberController {

    private final MemberService memberService;

    @Operation(summary = "회원 등록", description = "새로운 회원을 등록합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "유효성 검사 실패 또는 이메일 중복")
    })
    @PostMapping
    public ResponseEntity<MemberResponse> create(@RequestBody @Valid MemberCreateRequest request) {
        MemberResponse response = memberService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "회원 단건 조회", description = "ID로 특정 회원을 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "존재하지 않는 회원")
    })
    @GetMapping("/{id}")
    public ResponseEntity<MemberResponse> findById(
            @Parameter(description = "회원 ID") @PathVariable Long id) {
        return ResponseEntity.ok(memberService.findById(id));
    }

    @Operation(summary = "회원 전체 조회", description = "등록된 모든 회원을 조회합니다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<List<MemberResponse>> findAll() {
        return ResponseEntity.ok(memberService.findAll());
    }

    @Operation(summary = "회원 정보 수정", description = "이름 또는 비밀번호를 수정합니다. 변경할 항목만 포함하면 됩니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "존재하지 않는 회원 또는 유효성 검사 실패")
    })
    @PutMapping("/{id}")
    public ResponseEntity<MemberResponse> update(
            @Parameter(description = "회원 ID") @PathVariable Long id,
            @RequestBody @Valid MemberUpdateRequest request) {
        return ResponseEntity.ok(memberService.update(id, request));
    }

    @Operation(summary = "회원 삭제", description = "ID로 특정 회원을 삭제합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "삭제 성공"),
            @ApiResponse(responseCode = "400", description = "존재하지 않는 회원")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "회원 ID") @PathVariable Long id) {
        memberService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
