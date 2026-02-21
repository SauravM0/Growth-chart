import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CombinedIapChart from '../chart/combined/CombinedIapChart';

function CombinedVisualPage() {
  const [searchParams] = useSearchParams();
  const sex = searchParams.get('sex') === 'M' ? 'M' : 'F';

  return (
    <section
      data-testid="combined-visual-root"
      style={{
        width: '1200px',
        margin: '0 auto',
        padding: '20px 0',
        background: '#ffffff',
      }}
    >
      <div data-testid="combined-visual-canvas" style={{ width: '1100px', margin: '0 auto' }}>
        <CombinedIapChart sex={sex} calibrationImageVisible={false} className="w-full" />
      </div>
    </section>
  );
}

export default CombinedVisualPage;
