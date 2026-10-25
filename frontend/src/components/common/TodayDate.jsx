import React from 'react';

function TodayDate() {
  return (
    <div className="dashboard-date">
      <span className="date-icon">▦</span>

      <div>
        <strong>
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </strong>

        <span>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
          })}
        </span>
      </div>
    </div>
  );
}

export default TodayDate;
