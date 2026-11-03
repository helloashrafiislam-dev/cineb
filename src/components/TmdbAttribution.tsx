import React from 'react';

/** Required TMDB attribution — https://www.themoviedb.org/about/logos-attribution */
export const TmdbAttribution: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-neutral-500 ${className}`}
    >
      
      <p className="text-center sm:text-left max-w-xl leading-relaxed">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
        Movie metadata and artwork are provided by{' '}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400/90 hover:text-sky-300 underline-offset-2 hover:underline"
        >
          The Movie Database (TMDB)
        </a>
        .
      </p>
    </div>
  );
};
