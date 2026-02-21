import React from 'react';
import CombinedIapChart from '../chart/combined/CombinedIapChart';

function CombinedPrintSheet({ sex = '', measurements = [], dobISO = '' }) {
  return (
    <section className="print-combined-sheet">
      <div className="print-combined-chart">
        <CombinedIapChart
          sex={sex}
          measurements={measurements}
          dobISO={dobISO}
          showValues={false}
          calibrationImageVisible={false}
          className="w-full"
        />
      </div>
    </section>
  );
}

export default CombinedPrintSheet;
