// 기관 카탈로그 설정을 파일 파서 힌트로 변환합니다.
import type { InstitutionConfig } from "../institutions/institution-types";

export type InstitutionParserHints = {
  parserKey: string;
  institutionName: string;
  dateColumnHints: string[];
  amountColumnHints: string[];
  merchantColumnHints: string[];
  statusColumnHints: string[];
};

export function toParserHints(institution: InstitutionConfig): InstitutionParserHints {
  return {
    parserKey: institution.parserKey,
    institutionName: institution.name,
    dateColumnHints: institution.dateColumnHints,
    amountColumnHints: institution.amountColumnHints,
    merchantColumnHints: institution.merchantColumnHints,
    statusColumnHints: institution.statusColumnHints,
  };
}
