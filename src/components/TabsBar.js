import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

function TabsBar({ tabs, panels, defaultTab }) {
  const initialTab = useMemo(() => {
    if (defaultTab && tabs.includes(defaultTab)) {
      return defaultTab;
    }
    return tabs[0];
  }, [defaultTab, tabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent>{panels?.[activeTab] || null}</TabsContent>
    </Tabs>
  );
}

export default TabsBar;
