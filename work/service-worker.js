/**
 * 이 파일은 애플리케이션 루트에 상주해야 한다.
 * 왜냐하면 서비스 워커의 범위는 이 파일이 있는 디렉토리에 의해 정의되기 떄문이다.
 */
var dataCacheName = 'weatherData-v1';
var cacheName = 'weatherPWA-step-6-1';
var filesToCache = [
  '/',
  '/index.html',
  '/scripts/app.js',
  '/styles/inline.css',
  '/images/clear.png',
  '/images/cloudy-scattered-showers.png',
  '/images/cloudy.png',
  '/images/fog.png',
  '/images/ic_add_white_24px.svg',
  '/images/ic_refresh_white_24px.svg',
  '/images/partly-cloudy.png',
  '/images/rain.png',
  '/images/scattered-showers.png',
  '/images/sleet.png',
  '/images/snow.png',
  '/images/thunderstorm.png',
  '/images/wind.png'
];

self.addEventListener('install', function(e){
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    // 캐시를 열고 캐시이름을 지정한다. 캐시 이름을 지정하면 파일에 버전을 지정할 수 있거나 앱 셸로부터 데이터를 구분할 수 있으므로,
    // 다른 데이터에는 영향을 미치지 않고 쉽게 데이터를 업데이트할 수 있다.
    caches.open(cacheName).then(function(cache){
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache); // 캐시가 열리면 cache.addAll()을 호출할 수 있다.
    })
  )
});

self.addEventListener('activate', function(e){
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList){
      return Promise.all(keyList.map(function(key){
        if(key !== cacheName && key !== dataCacheName){
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(e){
  console.log('[ServiceWorker] Fetch', e.request.url);
  var dataUrl = 'https://query.yahooapis.com/v1/public/yql';
  if(e.request.url.indexOf(dataUrl) > -1){
    /**
     *  요청 URL이 dataUrl을 포함했을 때 앱은 fresh 날씨 데이터를 요청한다.
     *  이 경우에, 서비스워커는 항상 네트워크에 요청하고 응답 데이터를 캐시한다.
     *  이를 '선 캐시 후 네트워크 전략'이라 부른다.
     *  https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
     */
    e.respondWith(
      caches.open(dataCacheName).then(function(cache){
        return fetch(e.request).then(function(response){
          // 응답이 반환되면 코드에서 캐시를 열고, 이 응답을 복제하여 캐시에 저장하고,
          // 마지막으로 응답을 원래 요청자에게 반환한다.
          cache.put(e.request.url, response.clone());
          return response;
        });
      })
    );
  } else {
    /**
     * 앱이 앱 셸 파일들에 대해 요청한다.
     * 이 시나리오에서는 앱은 '네트워크 요청 실패했을 때 캐시' 오프라인 전략을 사용한다.
     * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
     */
     e.respondWith(
       caches.match(e.request).then(function(response){
         return response || fetch(e.request);
       })
     );
  }
});
