import React from 'react';

function StatCards({ stats }) {
  return (
    <section className="statistics-grid">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.title}>
          <div className={`stat-icon ${stat.color}`}>
            {stat.icon}
          </div>

          <div className="stat-information">
            <span>{stat.title}</span>

            <strong>{stat.value}</strong>

            <small>
              <b>↑ {stat.change}</b> from last term
            </small>
          </div>
        </article>
      ))}
    </section>
  );
}

export default StatCards;
