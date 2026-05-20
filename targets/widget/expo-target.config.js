/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#FF6B9D',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.giwon.babylog'],
  },
}
