/**
 * Expo config plugin to add foldable device support
 * Adds configChanges to AndroidManifest.xml to prevent activity restart on screen size changes
 */
const { withAndroidManifest } = require('expo/config-plugins');

function withFoldableSupport(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    
    // Find the main activity
    const mainApplication = manifest.manifest.application?.[0];
    if (!mainApplication) {
      console.warn('withFoldableSupport: Could not find application in AndroidManifest');
      return config;
    }

    const activities = mainApplication.activity;
    if (!activities || activities.length === 0) {
      console.warn('withFoldableSupport: Could not find activities in AndroidManifest');
      return config;
    }

    // Find the main activity (usually the first one with intent-filter for MAIN/LAUNCHER)
    for (const activity of activities) {
      const intentFilters = activity['intent-filter'];
      const isMainActivity = intentFilters?.some((filter) => {
        const actions = filter.action;
        const categories = filter.category;
        return (
          actions?.some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN') &&
          categories?.some((c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER')
        );
      });

      if (isMainActivity || activities.length === 1) {
        // Add configChanges to handle foldable screen changes without restart
        // screenSize - handles foldable expand/collapse
        // smallestScreenSize - handles split-screen mode
        // screenLayout - handles screen layout changes
        // orientation - handles rotation
        // keyboard - handles keyboard appearance
        // keyboardHidden - handles keyboard hide
        // density - handles display density changes
        const currentConfigChanges = activity.$?.['android:configChanges'] || '';
        const requiredChanges = [
          'screenSize',
          'smallestScreenSize', 
          'screenLayout',
          'orientation',
          'keyboard',
          'keyboardHidden',
          'density',
        ];
        
        // Parse existing changes
        const existingChanges = currentConfigChanges.split('|').filter(Boolean);
        
        // Add missing changes
        for (const change of requiredChanges) {
          if (!existingChanges.includes(change)) {
            existingChanges.push(change);
          }
        }
        
        // Update the activity
        activity.$['android:configChanges'] = existingChanges.join('|');
        
        // Ensure singleTask launch mode for proper deep link handling
        activity.$['android:launchMode'] = 'singleTask';
        
        // Enable resizing for foldables
        activity.$['android:resizeableActivity'] = 'true';
        
        console.log('withFoldableSupport: Updated activity with foldable support');
        break;
      }
    }

    return config;
  });
}

module.exports = withFoldableSupport;
