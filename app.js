/**
 * Sproutable
 */

// Default Variables
var bounds;
var categories  = 'restaurants,active,arcades,galleries,gardens,movietheaters,festivals,museums,theater,sportsteams,stadiumsarenas,education,campgrounds,tours,skiresorts,poolhalls,farmersmarket';
var center;
var current;
var current_location = '';
var current_term = '"Good+For+Kids"';
var current_sort = 0;
var lat         = '33.195869';
var lng         = '-117.379483';
var limit       = 0;
var map;
var markers     = [];
var mode        = 0;
var offset      = 0;
var pg          = 1;
var pages       = 1;
var results     = [];
var u = 'undefined';
var updateTimer;

if(!$.browser.msie) $('.t').addClass('nie');

// If Browser is Location Aware
if(navigator.geolocation){
  
  // Get User Location
  navigator.geolocation.getCurrentPosition(function(b){
  
    // Set Latitude and Longitude
    lat     = b.coords.latitude;
    lng     = b.coords.longitude;
    center  = new google.maps.LatLng(lat,lng);
    
    // Center Map on User Location
    if(typeof(map) != u && map != null) map.setCenter(center);
  
    // Convert Lat/Lng to Address
    var geocoder=new google.maps.Geocoder();
    geocoder.geocode({'latLng': center}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK){
      
        // Update Location Placeholder with User City/State
        var ph = '',loc = '';
        var addr = results[0].address_components;
        var valid = {
          'street_number' : '',
          'route' : ' ',
          'locality' : ', ',
          'administrative_area_level_1' : ', ',
          'postal_code' : ' '
        };
        var field = {
          'locality' : '',
          'administrative_area_level_1' : ', '
        };
        for(i in addr){
          if(addr[i].types[0] in valid) loc += valid[addr[i].types[0]] + addr[i].long_name;
          if(addr[i].types[0] in field) ph += field[addr[i].types[0]] + addr[i].short_name;
        }
        $('#l').attr('placeholder',ph);
        current_location = loc;
      }
    });
  
    // Instantiate Category Array
    var cats = [];
    
    // Perform Initial Location Search
    yelp('search',{
      ll:lat + ',' + lng,
      term:current_term
    },function(d){
    
      // Get Business Categories
      if(d.businesses.length > 0){
        
        results = d.businesses;
        var t = '';
        $.each(results,function(i,b){
          var c = b.categories[b.categories.length - 1][0];
          cats.push(c);
          if(t.length + c.length <= 30 && !(c in cats)) t += (t != '' ? ', ' : '') + c;
        });
      
        // Update Search Term Placeholder with Nearby Categories
        $('#t').attr('placeholder',t + ', etc.');
      }
    });
  },function(e){
    // If Location Wasn't Found
  
  },{
    timeout:10000
  }); 
}

// Search Form Submission
$('form').submit(function(e){
  
  // Prevent Defauly Submit Behavior
  e.preventDefault();
  $('.s').focus();
  
  // Get Search Input Data
  var location = $('#l').val();
  var term = $('#t').val() + ($('#t').val() != '' ? ' ' : '') + '"Good For Kids"';
  var sort = $('#sort').val();
  
  // Define API Data
  if(location != current_location || term != '' && term != current_term || sort != current_sort){
    var p = {
      term : term.replace(/ /g,'+'),
      sort : sort
    };
    if(lat != '' && lng != '') p[location != '' ? 'cll' : 'll'] = lat + ',' + lng;
    if(location != '') p.location = location.replace(/ /g,'+');
    
    current_location = location != '' ? location : current_location;
    current_term = term != '' ? term : current_term;
    current_sort = sort;
  
    // Query the Yelp API
    yelp('search',p,function(d){
      results = d.businesses;
      pages = Math.ceil(results.length/limit);
      showPage(1);
    }); 
  }
});

function showPage(page, speed){  
  pg = page > pages ? pages : page;
  var time = 100,
  offset = (pg-1)*limit,
  positions = [];
  
  if(typeof(speed) == u) speed = 400;
  $('body > .d').animate({ opacity:0 },200,function(){ $(this).remove(); });
  
  // Paging
  if(mode == 1){
    $('#total').text(pages);
    $('#page').text(pg);
    if(pg == 1){  
      $('#prev').hide()
    }else{
      $('#prev').unbind('click').click(function(e){
        e.preventDefault();
        showPage(pg - 1);
      }).show();
    }
    if(pg == pages){  
      $('#next').hide()
    }else{
      $('#next').unbind('click').click(function(e){
        e.preventDefault();
        showPage(pg + 1);
      }).show();
    } 
  
    // Clear Markers
    for(i in markers){
      markers[i].setMap(null);
    }
    markers = [];
  }
      
  if($('#r').length == 0) $('<section id="r" />').insertAfter('#s');
    
  // Hide Results
  $('#r .g').animate({
    opacity:0
  },speed);
  $('#r').animate({
    'height':0
  },speed,function(){
    // Create or Remove Results Container
    if(results.length > 0){
      
      // Empty Result Container
      $('#r').html('');
  
      // Create Business Listings
      for(i=offset;i<offset+limit && i < results.length;i++){
        (function(){
    
          // Build Category List
          var b=results[i],a='',c='',ca=b.categories,l=b.location,lt = l.coordinate.latitude, ln = l.coordinate.longitude;
          for(x=0; x < ca.length; x++){
            c += (c != '' ? ', ' : '') + ca[x][0];
          }
          
          a += typeof(l.address[0]) != u ? l.address[0] : '';
          a += (typeof(l.address[1]) != u ? (a != '' ? ', ' : '') + l.address[1] : '');
          a += (typeof(l.city) != u ? (a != '' ? '<br /> ' : '') + l.city : '');
          a += (typeof(l.state_code) != u ? (a != '' ? ', ' : '') + l.state_code : '');
          a += (typeof(l.postal_code) != u ? (a != '' ? ' ' : '') + l.postal_code : '');
          
          var ml = 'http://maps.google.com/maps?daddr=' + b.name + ', ' + a.replace(/<br \/>/g,', ') + (current_location != '' ? '&saddr=' + current_location : '');
  
          // Build Business Listing
          var $a = $('<article class="g" />'),
              $h = $('<header class="h clear" />');
          $h.append('<div class="img rs">' + (typeof(b.image_url) == 'string' ? '<img class="rs" src="' + b.image_url + '" />' : '') + '</div>');
          $h.append('<h1>' + b.name + '</h1>');
          
          if(typeof(b.distance) != u){
            var distance  = (Math.round((b.distance*10)/1609.344)/10),
              unit = 'mile'; 
            if(distance == 0){
              distance = Math.round(b.distance);
              unit  = 'meter';
            } 
            $h.append('<div class="distance rs">' + distance + ' ' + unit + (distance != 1 ? 's' : '') + '</div>');
          }
          $h.append('<img class="rating rs" src="' + b.rating_img_url + '" />');
          
          // Business Detail
          var $d = $('<div class="d r clear" />');
          var $i = $('<div class="inner" />').appendTo($d);
          $i.append('<h1 class="rt">' + b.name + '</h1>');
          var $m = $('<div class="meta" />').appendTo($i);
          $m.append('<div class="address"><h2>Address - <a href="' + ml  + '" target="_blank">Get Directions</a></h2><span>' + a + '</span></div>');
          if(typeof(b.display_phone) != u) $m.append('<div class="phone"><h2>Phone - <a class="phone" href="tel:+1' + b.phone + '" target="_self">Call</a></h2><span>' + b.display_phone + '</span></div>');
          $m.append('<div class="categories"><h2>Categories</h2><span>' + c + '</span></div>');
          $i.append('<div class="buttons rb"><a class="b r y" href="' + b.url + '" data-mobile="' + b.mobile_url + '" target="_blank">Read Reviews on Yelp</a></div>');
          $a.append($h,$d);
          $('#r').append($a);
        
          if(mode == 1){
            // Get Business Position
            var pos = new google.maps.LatLng(lt,ln);
            positions.push(pos);
  
            // Drop Pins
            setTimeout(function(){
      
              // Create Marker
              var marker = new google.maps.Marker({
                position:pos,
                map:map,
                animation: google.maps.Animation.DROP
              });
      
              // Marker Click Behavior
              google.maps.event.addListener(marker, 'click', function() {
                showLocation({
                  'el'          : $a,
                  'pos'         : pos
                });
              });
  
              // Listing Click Behavior
              $h.click(function(e){
                e.preventDefault();
                if($a.hasClass('active')){
                  $a.removeClass('active');
                }else{
                  showLocation({
                    'el'          : $a,
                    'pos'         : pos
                  });
                }
              });
      
              // Add Marker to Global Array
              markers.push(marker);
            },time);
     
            // Increment Pin Drop Time
            time += Math.random()*100;
          }else{
            // Listing Click Behavior
            $h.click(function(e){
              e.preventDefault();
              if($a.hasClass('active')){
                $a.removeClass('active');
              }else{
                if($i.find('.mp').length == 0) $i.prepend('<a class="mp" target="_blank" href="' + ml + '"><img class="rs" src="http://maps.googleapis.com/maps/api/staticmap?center=' + lt + ',' + ln + '&zoom=16&size=380x100&maptype=roadmap&markers=' + lt + ',' + ln + '&sensor=false" /></a>');
                showLocation({
                  'el': $a
                });
              }
            });
          }
        })();
      }
  
      // Show or Hide Paging
      if(mode == 1 && pages > 1){
        $('#n').show();
      }else{
        $('#n').hide();
      }
  
      // Animate Results
      $('#r .g').animate({
        opacity:1
      },speed);
      $('#r').animate({
        'height':($('#r .g').length < limit ? $('#r .g').length : limit) * 72
      },speed,function(){
        if(mode == 0){
          $('#r').css('height','auto');      
          $('html,body').animate({
            'scrollTop': $('#r .g:first').offset().top
          });
        }
      });
  
      // Center Map on Pins
      if(mode == 1 && typeof(map) != u && map != null && results.length > 0){
        // Center Map on Pin Area
        bounds = new google.maps.LatLngBounds();
        for(i in positions){
          bounds.extend(positions[i]);
        }
        map.setZoom(14);
        map.fitBounds(bounds);  
      }
    }else{
      $('#r').remove();
    }
  });
}

// Define External Link Behavior
$('a').not('[href^="tel"],[href^="#"],[href^="/"],[href*="' + window.location.host + '"]').attr('target','_blank');
$('a').live('click',function(e){ 
  if(mode == 0 && $(this).attr('data-mobile') != ''){
    $(this).attr('data-desktop',$(this).attr('href'));
    $(this).attr('href',$(this).attr('data-mobile'));
  }else if($(this).attr('data-desktop') != ''){
    $(this).attr('href',$(this).attr('data-desktop'));
  }
});

// Center Map in Visible Region
function centerMap(cb,pan)
{
  if(typeof(pan) == u) var pan = true;
  var s = Math.pow(2, map.getZoom()),
  wc = map.getProjection().fromLatLngToPoint(current),
  m = $('#c').offset().left + $('#c').outerWidth(),
  x = ($(window).width() - m) / 2,
  y = $(window).height()/6;
  wc.x = ((wc.x * s) - (x + m - ($(window).width() / 2)))/s;
  wc.y = ((wc.y * s) - y)/s;
  var loc = map.getProjection().fromPointToLatLng(wc);
  map.panTo(loc);
  if(typeof(cb) != u){
    google.maps.event.addListenerOnce(map, 'idle', function(){
      cb(x + m);
    }); 
  }
}

// Show Location Detail
function showLocation(opts)
{
  $('.g').not(opts.el).removeClass('active');
  opts.el.addClass('active');
  if(mode == 0)
  {
    $('html,body').animate({
      'scrollTop': opts.el.offset().top - 1
    });
  }
  else
  {    
    $('body > .d').animate({ opacity:0 },200,function(){ $(this).remove(); });
    current = opts.pos;
    var $d = opts.el.find('.d').clone();
    $d.css({
      opacity: 0
    }).appendTo('body');
    if(typeof(opts.pan) == u) opts.pan = true;
    centerMap(function(w){
      $('body > .d').css({
        left: w - $('body > .d').outerWidth()/2,
        bottom: '34%'
      }).animate({
        opacity: 1,
        bottom: '38%'
      });
    },opts.pan);
  }
}

// Window Resize Bahavior
function update()
{   
  // Determine Mode
  mode = $(window).width() >= 769 ? 1 : 0;
  
  // Hide Info Box
  $('body > .d').animate({
    bottom: '34%',
    opacity: 0
  },200,function(){
    $(this).remove();
  });
  
  // If "Mobile"
  if(mode == 0)
  {
    // Clear Listing Limits
    new_limit = 999;
    pages = 1;
    
    // Hide Desktop Elements Boxes
    $('#n').hide();
    
    // Get Static Map
    if($('#m > img').length < 1) $('#m').html('<img src="http://maps.googleapis.com/maps/api/staticmap?center=' + lat + ',' + lng + '&zoom=14&size=768x768&maptype=roadmap&sensor=false" />');
    
    // Disable Dynamic Map
    map = null;
  }
  else
  // If Desktop
  {    
    if(typeof(map) == u || map == null)
    {
      // Set Center
      center = new google.maps.LatLng(lat,lng);
      
      // Create Google Map
      map = new google.maps.Map(document.getElementById('m'),{ 
        zoom              : 12, 
        center            : center,
        draggable         : false,
        mapTypeId         : google.maps.MapTypeId.ROADMAP, 
        scrollwheel       : false, 
        mapTypeControl    : false, 
        panControl        : false, 
        zoomControl       : false, 
        streetViewControl : false 
      });
    }
    
    // Center Map
    if($('.g').length > 0)
    {
      $('.g').removeClass('active');
      map.fitBounds(bounds);
    }
    
    // Set Limit
    var new_limit = Math.floor(($(window).height() - parseInt($('#c').css('margin-top')) - parseInt($('#c').css('margin-bottom')) - $('#s').outerHeight() - $('#h').outerHeight() - $('#n').outerHeight() - $('#f').outerHeight() - 16) / 72);
    pages = Math.ceil(results.length/new_limit);
  }
  
  // Show Page
  if(new_limit <= 0) new_limit = 1;
  if(new_limit != limit){
    limit = new_limit;
    if($('.g').length > 0) showPage(pg,0);
  }
}

// Define Update Behavior
$(window).resize(update);
update();