// File: frontend/src/pages/admin/AdminIndexPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Página de aterrizaje (Landing) para el módulo administrativo.
// Rol: Punto de entrada inicial para los organizadores. No requiere autenticación
//      previa para visualizarse, pero redirige al login.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Card, Button } from '@/components/common';

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminIndexPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminIndexPage: React.FC = () => {

    // -------------------------------------------------------------------------
    // Manejadores de eventos
    // -------------------------------------------------------------------------

    // Redirección simple al formulario de login
    const handleLoginClick = () => {
        window.location.href = '/admin/login.html';
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem' 
        }}>
            {/* Contenedor centralizado para la presentación */}
            <Card className="w-full max-w-md text-center p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 font-serif">
                    Panel de Organización
                </h1>
                
                <p className="text-gray-600 mb-8">
                    Bienvenido al panel de gestión para los novios. 
                    Desde aquí podrás administrar la lista de invitados, 
                    ver confirmaciones en tiempo real y gestionar los detalles del evento.
                </p>

                <div className="space-y-4">
                    <Button onClick={handleLoginClick} className="w-full">
                        Iniciar sesión como organizador
                    </Button>
                </div>
                
                <div className="mt-8 text-sm text-gray-500">
                    <p>Acceso restringido para administradores.</p>
                </div>
            </Card>
        </div>
    );
};

export default AdminIndexPage;
