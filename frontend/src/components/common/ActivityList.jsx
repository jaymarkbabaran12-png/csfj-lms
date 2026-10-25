import React from 'react';

function ActivityList({ activities, onViewAll }) {
  return (
    <article className="dashboard-card recent-activities-card">
      <div className="card-heading">
        <div>
          <h2>Recent Activities</h2>
          <p>Latest system updates</p>
        </div>

        {onViewAll && (
          <button
            type="button"
            className="text-link"
            onClick={onViewAll}
          >
            View All
          </button>
        )}
      </div>

      <div className="activity-list">
        {activities.map((activity) => (
          <div
  className="activity-item"
  key={`${activity.title}-${activity.description}-${activity.time}`}
>
            <div className={`activity-icon ${activity.color}`}>
              {activity.icon}
            </div>

            <div className="activity-description">
              <strong>{activity.title}</strong>
              <span>{activity.description}</span>
            </div>

            <small>{activity.time}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

export default ActivityList;
