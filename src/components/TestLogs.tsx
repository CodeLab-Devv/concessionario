import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog } from '../types';

export const TestLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data || []);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Recent Activity Logs</h2>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="p-2 border rounded">
            <p><strong>Action:</strong> {log.action}</p>
            <p><strong>Details:</strong> {log.details}</p>
            <p><strong>Timestamp:</strong> {new Date(log.created_at || log.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
