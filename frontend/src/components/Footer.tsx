
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-8 mt-auto bg-white border-t border-stone-100">
      <div className="container mx-auto px-4 text-center">
        
        {/* Línea 1: Marca del Producto */}
        <p className="text-stone-500 text-sm font-light tracking-wide mb-3">
          © {currentYear} Sistema RSVP <span className="mx-1 text-stone-300">•</span> Experiencias Digitales
        </p>

        {/* Línea 2: Firma con Icono LinkedIn */}
        <div className="flex justify-center items-center text-xs text-stone-400 gap-1">
          <span>Desarrollado por</span>
          
          <a
            href="https://www.linkedin.com/in/alex-suarez-dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 font-medium text-stone-600 hover:text-[#0077b5] transition-colors duration-300"
            title="Ver perfil profesional en LinkedIn"
          >
            {/* Icono LinkedIn SVG (Vector oficial) */}
            <svg 
              className="w-4 h-4 fill-current opacity-80 group-hover:opacity-100 transition-opacity" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.225 0z"/>
            </svg>
            
            <span className="underline decoration-stone-300 underline-offset-4 group-hover:decoration-[#0077b5]">
              Alexander Suárez
            </span>
          </a>
        </div>
        
      </div>
    </footer>
  );
}
