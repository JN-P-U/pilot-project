# Troubleshoot Guide

## NullPointerException in ServiceImpl
트랜잭션 범위 밖에서 지연 로딩(Lazy Loading) 호출 시 발생.
- 해결: `@Transactional` 범위 안으로 로직 이동 또는 `FetchType.EAGER`로 변경
- 확인: 세션이 열려 있는 범위에서 엔티티 접근 여부 점검

## DataSource Connection Timeout
커넥션 풀 고갈 또는 DB 서버 연결 불가.
- 해결: `application.yml`의 `spring.datasource.hikari.maximum-pool-size` 값 확인
- 확인: 미반환 커넥션(커넥션 릭) 여부 → `@Transactional` 누락 확인
- DB 서버 포트/방화벽 상태 확인

## MyBatis BindingException
매퍼 인터페이스와 XML namespace 불일치.
- 해결: XML의 `namespace`와 Java 인터페이스 패키지명 일치 여부 확인
- 확인: `mapper id`와 인터페이스 메서드명 일치 여부

## BadSqlGrammarException
SQL 문법 오류 또는 컬럼/테이블명 오타.
- 해결: `aidd sql -f` 로 로그에서 실제 SQL 복원 후 DB 클라이언트에서 직접 실행
- 확인: 동적 SQL `<if>` 조건 누락으로 WHERE 절 누락 여부

## ClassCastException in ResultMap
MyBatis resultMap 타입 불일치.
- 해결: XML `resultMap`의 `javaType`과 VO 필드 타입 일치 여부 확인
- 확인: Date/LocalDateTime 타입 매핑 설정

## Next.js Hydration Error
서버 렌더링 결과와 클라이언트 렌더링 결과 불일치.
- 해결: 브라우저 전용 코드(`window`, `localStorage`)를 `useEffect` 또는 dynamic import로 이동
- 확인: `"use client"` 누락 여부

## Next.js Build Error - Module not found
- 해결: import 경로 대소문자 확인 (Windows는 대소문자 구분 없어 로컬 통과, Linux 빌드 실패)
- 확인: `tsconfig.json`의 `paths` 별칭 설정 확인
