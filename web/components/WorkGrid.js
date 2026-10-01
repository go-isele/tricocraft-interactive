'use client';

import { useState } from 'react';

export default function WorkGrid({ projects, projectCategories }) {
  const [filter, setFilter] = useState('all');

  return (
    <>
      <div className="work-filters">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        {projectCategories.map((c) => (
          <button key={c.slug} type="button" className={filter === c.slug ? 'active' : ''} onClick={() => setFilter(c.slug)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="work-grid">
        {projects
          .filter((p) => filter === 'all' || p.category === filter)
          .map((p) => (
            <div className="work-card" key={p.slug || p.title}>
              <div className="thumb">{p.image ? <img src={p.image} alt={p.title} /> : p.icon}</div>
              <div className="body">
                <div className="loc">{p.location}</div>
                <h4>{p.title}</h4>
                <p>{p.description}</p>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
