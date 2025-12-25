import { useEffect, useState } from 'react';

export function useDiscourseSettings() {
  const [settings, setSettings] = useState<{ minTitle: number; minPost: number }>({ minTitle: 15, minPost: 20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('https://meta.fomio.app/site.json');
        const data = await res.json();
        setSettings({
          minTitle: data.site_settings.min_topic_title_length,
          minPost: data.site_settings.min_post_length,
        });
      } catch (e) {
        // fallback to defaults
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return { ...settings, loading };
} 