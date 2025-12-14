// File: frontend/src/pages/admin/AdminLoginPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Pantalla de inicio de sesión para los administradores.
// Rol: Autenticación de organizadores usando clave precompartida (Mock).
//      Redirige al dashboard tras validación exitosa.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import '@/styles/admin.css'; // Aseguramos que carguen los estilos admin

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminLoginPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminLoginPage: React.FC = () => {
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
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Simulamos un leve retraso para UX (feedback visual de carga)
        setTimeout(() => {
            // Validación Client-Side contra variable de entorno
            const validKey = import.meta.env.VITE_ADMIN_KEY || '';
            
            if (accessKey === validKey) {
                // Éxito: Guardamos flag de sesión y redirigimos
                localStorage.setItem('admin_auth', 'true');
                // IMPORTANTE: Redirección directa ya que no usamos react-router-dom globalmente
                window.location.href = '/admin/dashboard.html';
            } else {
                // Error: Clave incorrecta
                setError("La clave de acceso es incorrecta.");
                setLoading(false);
            }
        }, 800);
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
