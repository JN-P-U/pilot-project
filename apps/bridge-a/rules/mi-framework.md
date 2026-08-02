# Mi-Framework (Spring Boot) 코딩 규칙

## 프로젝트 구조
- `src/main/java/` : Java 소스
- `src/main/resources/mapper/` : MyBatis XML 매퍼
- `src/main/resources/application.yml` : 환경 설정

## 레이어 구조
- Controller → Service → ServiceImpl → Mapper (DAO) → XML
- Controller는 요청/응답 처리만 담당, 비즈니스 로직은 Service로 위임
- `@Transactional`은 ServiceImpl 메서드에 선언

## MyBatis 매퍼
- XML 매퍼 사용 (어노테이션 매퍼 지양)
- resultMap으로 컬럼-필드 명시적 매핑
- 동적 SQL은 `<if>`, `<choose>`, `<foreach>` 활용
- 파라미터가 여러 개일 때 VO/Map 사용, `#{}` 바인딩 사용 (`${}` 금지 - SQL Injection 위험)

## VO / DTO
- 요청: `~ReqVO`, 응답: `~ResVO`, DB 엔티티: `~VO`
- Lombok `@Data` 또는 Getter/Setter 명시
- `null` 허용 필드는 `Optional` 또는 Nullable 어노테이션으로 명시

## 예외 처리
- 비즈니스 예외: `MiException` 또는 커스텀 RuntimeException
- Controller Advice로 전역 처리
- 로그는 `log.error("[메서드명] 오류 메시지", e)` 형식

## 금지 사항
- `${}` 파라미터 바인딩 금지 (SQL Injection)
- Service 레이어에서 HttpServletRequest 직접 참조 금지
- 트랜잭션 경계 밖에서 지연 로딩 금지
