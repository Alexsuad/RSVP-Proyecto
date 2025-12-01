// File: frontend/src/pages/app/RecoverCodePage.tsx 
//-----------------------------------------------------------------------------
// Propósito: Página de recuperación de código de invitado.
// Rol en el sistema: Permite al usuario solicitar el reenvío de su código de
//            acceso mediante email o teléfono, manejando validaciones y
//            feedback de errores (incluyendo Rate Limiting).
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert } from '@/components/common';
import PageLayout from '@/components/PageLayout';

const RecoverCodePage: React.FC = () => {
    // -------------------------------------------------------------------------
    // Bloque: Estado local
    // Propósito: Gestionar inputs del formulario y estados de feedback (carga,
    //            errores, éxito).
    // -------------------------------------------------------------------------
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ form?: string }>({});
    const [loading, setLoading] = useState(false);
    
    const { t } = useI18n();

    // -------------------------------------------------------------------------
    // Bloque: Manejo del envío (Submit)
    // Propósito: Normalizar datos, validar requisitos mínimos y llamar a la API
    //            gestionando respuestas 200, 429 y errores genéricos.
    // -------------------------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setMessage(null);

        // Normalización previa a validación (Logic Fix)
        const emailClean = email.trim().toLowerCase();
        const phoneClean = phone.trim();

        // Validación: Al menos un campo requerido
        if (!emailClean && !phoneClean) {
            setErrors({ form: t('recover.invalid') }); // Alineado con Python
            return;
        }
        
        setLoading(true);

        try {
            // Envío de datos sanitizados
            await guestService.recoverCode({ 
                email: emailClean || undefined, 
                phone: phoneClean || undefined 
            });
            
            // Éxito: Mostramos mensaje y ocultamos formulario
            setMessage(t('recover.success'));

        } catch (err: any) {
            console.error('Recover error:', err);
            
            // Gestión de errores específica (repara el manejo de 429)
            const status = err?.response?.status ?? err?.status;
            let errorKey = 'recover.generic';

            if (status === 429) {
                // Rate Limit: "Has realizado demasiados intentos..."
                errorKey = 'recover.rate_limited'; 
                // Nota: Si translations soporta {retry}, se podría formatear aquí,
                // pero por simplicidad usamos el mensaje base o genérico.
            } else if (status === 400) {
                errorKey = 'recover.invalid';
            }

            setErrors({ form: t(errorKey) });
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Bloque: Renderizado
    // Propósito: Construir la UI centrada con tarjeta, manejando condicionalmente
    //            el formulario o el mensaje de éxito.
    // -------------------------------------------------------------------------
    return (
        <PageLayout>
            <Card className="form-card">
                {/* Cabecera común */}
                <div className="text-center">
                    <h1 className="form-title h1-small">{t('recover.title')}</h1>
                    <p className="form-subtitle">{t('recover.subtitle')}</p>
                </div>

                {message ? (
                    // Estado de Éxito
                    <div className="form-body text-center animate-fade-in">
                        <Alert message={message} variant="success" />
                        <a href="/app/login.html" className="form-footer__link inline-block mt-4">
                            ⬅️ {t('recover.back')}
                        </a>
                    </div>
                ) : (
                    // Formulario de Solicitud
                    <form onSubmit={handleSubmit} className="form-body space-y-4" noValidate>
                        {errors.form && <Alert message={errors.form} variant="danger" />}
                        
                        <FormField 
                            id="email" 
                            label={t('recover.email')} 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            error={errors.form ? ' ' : undefined} 
                        />
                        <FormField 
                            id="phone" 
                            label={t('recover.phone')} 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            error={errors.form ? ' ' : undefined} 
                        />
                        
                        <Button type="submit" loading={loading} disabled={loading}>
                            {t('recover.submit')}
                        </Button>
                    </form>
                )}

                {/* Pie de página (siempre visible si no hay éxito, o condicional) */}
                {!message && (
                    <div className="form-footer">
                        <a href="/app/login.html" className="form-footer__link">
                            ⬅️ {t('recover.back')}
                        </a>
                    </div>
                )}
            </Card>
        </PageLayout>
    );
};

export default RecoverCodePage;