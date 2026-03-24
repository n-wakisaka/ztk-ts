export type ZtkDiagnosticKind = 'validation' | 'serialization-policy';
export type ZtkSerializationPolicyEffect =
  | 'canonicalization'
  | 'source-loss'
  | 'runtime-materialization';

export type ZtkDiagnosticBase = {
  code: string;
  message: string;
  tag: string | null;
  key?: string;
};

export type ZtkValidationDiagnostic = ZtkDiagnosticBase & {
  kind: 'validation';
};

export type ZtkSerializationDiagnostic = ZtkDiagnosticBase & {
  kind: 'serialization-policy';
  effect: ZtkSerializationPolicyEffect;
};

export type ZtkDiagnostic = ZtkValidationDiagnostic | ZtkSerializationDiagnostic;

export function createValidationDiagnostic(diagnostic: ZtkDiagnosticBase): ZtkValidationDiagnostic {
  return {
    kind: 'validation',
    ...diagnostic,
  };
}

export function createSerializationDiagnostic(
  diagnostic: ZtkDiagnosticBase & { effect: ZtkSerializationPolicyEffect },
): ZtkSerializationDiagnostic {
  return {
    kind: 'serialization-policy',
    ...diagnostic,
  };
}
