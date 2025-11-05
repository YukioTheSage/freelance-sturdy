import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SkeletonCard = ({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="project-card">
          <Skeleton height={24} width="70%" style={{ marginBottom: '0.5rem' }} />
          <Skeleton height={20} width={80} style={{ borderRadius: '12px', marginBottom: '0.5rem' }} />
          <Skeleton count={3} style={{ marginTop: '0.5rem' }} />
          <Skeleton height={20} width={60} style={{ marginTop: '0.5rem', borderRadius: '12px' }} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Skeleton width={120} />
            <Skeleton width={100} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Skeleton height={24} width={70} style={{ borderRadius: '12px' }} />
            <Skeleton height={24} width={90} style={{ borderRadius: '12px' }} />
            <Skeleton height={24} width={60} style={{ borderRadius: '12px' }} />
          </div>
          <Skeleton width="50%" style={{ marginTop: '0.5rem' }} />
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
