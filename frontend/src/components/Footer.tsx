export default function Footer() {
  return (
    <footer className="w-full py-8 mt-auto bg-white border-t border-stone-100">
      <div 
        className="container mx-auto px-4"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        <p 
          className="text-stone-500 text-sm font-light tracking-wide"
          style={{ textAlign: 'center', width: '100%' }}
        >
          <span>© 2026 <a href="https://www.linkedin.com/in/alex-suarez-dev/" target="_blank" rel="noopener noreferrer" className="hover:text-[#b48a50] transition-colors font-medium">Alex Suárez</a>.</span>
          <span className="mx-2 text-stone-300 hidden sm:inline">•</span>
          <span className="block sm:inline mt-1 sm:mt-0">
            Tecnología hecha con <span className="text-red-400 mx-0.5">❤️</span> para <span className="font-medium text-[#b48a50]">Jenny & Cristian</span>.
          </span>
        </p>
      </div>
    </footer>
  );
}
