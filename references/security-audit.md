# Auditoría de seguridad (@security-auditor)

Estándar: `specs/11-autenticacion-supabase.md`, `specs/12-seguridad-basica.md`.

Leyenda: ✅ verificado con evidencia · ⚠️ con hallazgos o sin verificar · ❌ falla

## Estado por área

| Área    | Estado         | Hallazgos abiertos | Última auditoría | Commit |
| ------- | -------------- | ------------------ | ---------------- | ------ |
| db      | ✅ conforme (con 🟢) | 1 🟢 (grants amplios, mitigados por RLS) | 2026-11-05 | a6eab59 |
| auth    | ⚠️ con hallazgos | 1 🟡 (dashboard: complejidad de contraseña y mínimo sin confirmar), 1 🟢 | 2026-11-05 | a6eab59 |
| app     | ✅ conforme | —                  | 2026-11-05 | a6eab59 |
| headers | ✅ conforme | —                  | 2026-11-05 | a6eab59 |
| deps    | ✅ conforme | —                  | 2026-11-05 | a6eab59 |

## Riesgos aceptados

| Riesgo                                                          | Spec    | Revisar si…                          |
| --------------------------------------------------------------- | ------- | ------------------------------------ |
| `auth_leaked_password_protection` desactivado (plan Free)       | SPEC 12 | el proyecto pasa a Pro               |
| Sin Content-Security-Policy                                     | SPEC 12 | se añaden scripts/orígenes externos  |
| Invitado puede usar el username de un usuario registrado        | SPEC 11 | aparecen suplantaciones en el Salón  |
| `scores` sin antispam ni rangos de `score`                      | SPEC 12 | el spam ensucia el ranking           |
| Sin rate limit propio en `POST /api/contact`                    | SPEC 12 | se recibe spam por el formulario     |

## Historial

| Fecha | Área | Resultado | Notas |
| ----- | ---- | --------- | ----- |
| 2026-11-05 | todo | db/app/headers/deps ✅; auth ⚠️ | RLS y políticas conformes; 5 cabeceras en 4 rutas; npm audit 0 vulnerabilidades. Signup con `abc1234` rechazado por `weak_password` con reason `characters` (el dashboard exige composición, contra SPEC 12); mínimo de 8 no confirmado. Grants de tabla amplios para anon/authenticated (incl. TRUNCATE), no explotables vía API. |
