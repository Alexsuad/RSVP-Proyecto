// frontend/src/pages/app/__tests__/LoginPage.sanitizeContact.test.ts
// =================================================================================
// Pruebas unitarias para la función sanitizeContact definida en LoginPage.
// Verifican el comportamiento al recibir correos, teléfonos y valores vacíos.
// =================================================================================

import { describe, it, expect } from 'vitest';
import { sanitizeContact } from '../LoginPage';

describe('sanitizeContact', () => {
  it('detecta un correo electrónico y lo normaliza a minúsculas', () => {
    const result = sanitizeContact('  Email@GMAIL.COM  ');
    expect(result).toEqual({ email: 'email@gmail.com' });
  });

  it('detecta un teléfono y elimina caracteres no numéricos', () => {
    const result = sanitizeContact(' (+34) 600-123-456 ');
    expect(result).toEqual({ phone: '+34600123456' });
  });

  it('devuelve undefined si el teléfono queda vacío tras limpiar', () => {
    const result = sanitizeContact('   ---   ');
    expect(result).toEqual({ phone: undefined });
  });

  it('tolera valores vacíos o nulos sin lanzar errores', () => {
    const resultEmpty = sanitizeContact('');
    const resultSpaces = sanitizeContact('   ');
    expect(resultEmpty).toEqual({ phone: undefined });
    expect(resultSpaces).toEqual({ phone: undefined });
  });
});

