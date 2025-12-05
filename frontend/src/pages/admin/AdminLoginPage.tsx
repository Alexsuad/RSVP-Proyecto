// File: frontend/src/pages/admin/AdminLoginPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Pantalla de inicio de sesión para los administradores.
// Rol: Autenticación de organizadores usando clave precompartida (Mock).
//      Redirige al dashboard tras validación exitosa.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Card, Button, FormField, Alert } from '@/components/common';

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminLoginPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminLoginPage: React.FC = () => {
    // Estado local del formulario
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Constante para validación mock (simulación)


    // -------------------------------------------------------------------------
    // Lógica de Negocio
    // -------------------------------------------------------------------------

    // Maneja el envío del formulario de login
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Simulamos un leve retraso para UX
        setTimeout(() => {
            // Validación Client-Side contra variable de entorno
            const validKey = import.meta.env.VITE_ADMIN_KEY || '';
            
            if (accessKey === validKey) {
                console.log("Login admin correcto, redirigiendo al panel");
                window.location.href = '/admin/dashboard.html';
            } else {
                setError("La clave de acceso es incorrecta.");
                setLoading(false);
            }
        }, 800);
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem'
        }}>
            {/* Tarjeta de Login centrada */}
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 font-serif mb-2">
                        Iniciar Sesión
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Introduce tu clave de organizador para continuar
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Feedback de error si la validación falla */}
                    {error && <Alert message={error} variant="danger" />}

                    <FormField
                        label="Clave de acceso"
                        id="admin-key"
                        type="password"
                        placeholder="Introduce la clave..."
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        required
                    />

                    <Button 
                        type="submit" 
                        className="w-full"
                        loading={loading}
                    >
                        Entrar al Panel
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default AdminLoginPage;
