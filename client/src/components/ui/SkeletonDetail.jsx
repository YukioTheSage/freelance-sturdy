import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SkeletonDetail = () => {
  return (
    <div className="card">
      <Skeleton height={32} width="60%" style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Skeleton height={24} width={100} style={{ borderRadius: '12px' }} />
        <Skeleton height={24} width={80} style={{ borderRadius: '12px' }} />
      </div>
      <Skeleton count={5} style={{ marginTop: '0.5rem' }} />

      <div style={{ marginTop: '2rem' }}>
        <Skeleton height={24} width={150} style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Skeleton height={24} width={70} style={{ borderRadius: '12px' }} />
          <Skeleton height={24} width={90} style={{ borderRadius: '12px' }} />
          <Skeleton height={24} width={60} style={{ borderRadius: '12px' }} />
          <Skeleton height={24} width={80} style={{ borderRadius: '12px' }} />
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Skeleton height={24} width={120} style={{ marginBottom: '0.5rem' }} />
        <Skeleton count={2} />
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Skeleton height={40} width={120} />
        <Skeleton height={40} width={100} />
      </div>
    </div>
  );
};

export default SkeletonDetail;
