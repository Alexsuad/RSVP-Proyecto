// File: frontend/src/pages/admin/AdminLoginPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Pantalla de inicio de sesión para los administradores.
// Rol: Autenticación de organizadores usando clave precompartida (Mock).
//      Redirige al dashboard tras validación exitosa.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/admin.css'; // Aseguramos que carguen los estilos admin

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminLoginPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminLoginPage: React.FC = () => {
    const { adminLogin } = useAuth();
    // -------------------------------------------------------------------------
    // Estado local del formulario
    // -------------------------------------------------------------------------
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // -------------------------------------------------------------------------
    // Lógica de Negocio
    // -------------------------------------------------------------------------

    // Maneja el envío del formulario de login
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { default: apiClient } = await import('@/services/apiClient');
            
            interface LoginResponse {
                access_token: string;
                token_type: string;
            }

            const data = await apiClient<LoginResponse>('/api/admin/login', {
                method: 'POST',
                body: { password: accessKey }
            });

            // Éxito: Guardamos token en el contexto y redirigimos
            adminLogin(data.access_token);
            window.location.href = '/admin/dashboard.html';
  
        } catch (err: any) {
             console.error(err);
             setError("La contraseña es incorrecta o hubo un error de conexión.");
             setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Renderizado
    // -------------------------------------------------------------------------
    return (
        <div className="admin-scope admin-page admin-login-wrapper">
            <div className="admin-card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="admin-page-title" style={{ marginBottom: '0.5rem', display: 'block', border: 'none' }}>Iniciar Sesión</h1>
                    <h2 className="admin-text-muted" style={{ fontSize: '1.1rem', fontWeight: 500 }}>Panel de Organización</h2>
                    <p className="admin-text-muted" style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                        Introduce tu clave de organizador para continuar
                    </p>
                </div>

                {error && <div className="admin-alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label 
                            htmlFor="admin-key" 
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Clave de acceso
                        </label>
                        <input
                            id="admin-key"
                            type="password"
                            placeholder="Introduce tu clave..."
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="admin-btn-primary"
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Verificando...' : 'Entrar al Panel'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;
