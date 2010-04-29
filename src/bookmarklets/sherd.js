/*RULES
  1. NO single quote characters
*/
SherdBookmarklet = {
  "user_status": {/* updated by /accounts/logged_in.js */
      ready:false
  },
  run_with_jquery:function(func) {
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
      if (jQ) {
          func(jQ);
      } else {
          SherdBookmarkletOptions.onJQuery = func;
      }
  },
  "hosthandler": {
    /*Try to keep them ALPHABETICAL by 'brand' */
    "library.artstor.org": {
        find:function(callback) {
            /*must have floating pane open to find image*/
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var floating_pane = jQuery(".MetaDataWidgetRoot");
                if (!floating_pane.length) {
                    return callback([],"Try opening the image information pane by clicking its title under the thumbnail.");
                } else {
                    var obj = {"sources":{},"html":floating_pane.get(0),"metadata":[]};
                    var objectId = obj.html.id.substr(3);/*after 'mdw'*/
                    var done = 2; //# of queries
                    function obj_final() {
                        return callback([obj]);
                    }
                    jQuery
                    .ajax({url:"http://library.artstor.org/library/secure/imagefpx/"+objectId+"/103/5",
                           dataType:'json',
                           success:function(fpxdata,textStatus) {
                               var f = fpxdata[0];
                               obj.sources["fsiviewer"] = "http://viewer2.artstor.org/erez3/fsi4/fsi.swf";
                               obj.sources["image_fpx"] = f.imageServer+f.imageUrl;
                               obj.sources["image_fpx-metadata"] = "w"+f.width+"h"+f.height;
                               if (--done==0) obj_final();
                           },
                           error:function(){
                               if (--done==0) obj_final();
                           }
                          });
                    jQuery
                    .ajax({url:"http://library.artstor.org/library/secure/metadata/"+objectId,
                           dataType:'json',
                           success:function(metadata,textStatus) {
                               var img_link = metadata.imageUrl.match(/size\d\/(.*)\.\w+$/);
                               obj.sources["title"] = metadata.title;
                               obj.sources["thumb"] = "http://library.artstor.org"+metadata.imageUrl;
                               var m = metadata.metaData;
                               for (var i=0;i<m.length;i++) {
                                   ///so multiple values are still OK
                                   obj.metadata.push([ m[i].fieldName , m[i].fieldValue ]);
                               }
                               if (--done==0) obj_final(); 
                           },
                           error:function(){
                               if (--done==0) obj_final(); 
                           }
                          });
                }
            });
        }
    },
    "digitaltibet.ccnmtl.columbia.edu": {
        single:function() {
            return (document.location.pathname.search("/image/") == 0);
        },
        find:function(callback) {
            var real_site = "http://digitaltibet.ccnmtl.columbia.edu/";
            var img = jQuery(".node img").get(0);
            if (!img || !this.single()) 
                return callback([]);            

            var images = ImageAnnotator.images[0].imager.images; /*annotationfield*/
            var max_image = images[images.length-1];
	    var img_base = max_image.src.match(/images\/([^.]+)\./)[1];
	    var site_base = String(document.location).match(/(.*?)image/)[1];
	    var extension = max_image.src.substr(max_image.src.lastIndexOf("."));/*.JPG or .jpg--CRAZY!!!*/
	    var sources = {
	            "title":jQuery("#node-main h2.title").get(0).innerHTML,
	            "thumb":site_base+"files/tibet/images/"+img_base+".thumbnail"+extension,
	            "xyztile":real_site+"files/tibet/images/tiles/"+img_base+"/z${z}/y${y}/x${x}.png",
	            "image":max_image.src,
	            "archive":site_base,
	            "image-metadata":"w"+max_image.width+"h"+max_image.height,
	            "xyztile-metadata":"w"+max_image.width+"h"+max_image.height
	    };
            callback( [ {html:img, sources:sources} ] );
        },
        decorate:function(objs) {
        }
    },
    "flickr.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var apikey = SherdBookmarklet.options.flickr_apikey;
                if (!apikey) 
                    return callback([]);

                var bits = document.location.pathname.split("/");//expected:/photos/userid/imageid/
                var imageId = bits[3];

                if (imageId.length < 1 || imageId.search(/\d{1,12}/) < 0)
                    return callback([]);

                /* http://docs.jquery.com/Release:jQuery_1.2/Ajax#Cross-Domain_getJSON_.28using_JSONP.29 */
                var baseUrl = "http://api.flickr.com/services/rest/?jsoncallback=?&format=json&api_key="+apikey+"&photo_id="+imageId;

                jQuery.getJSON(baseUrl + "&method=flickr.photos.getInfo",
                    function(getInfoData) {
                        jQuery.getJSON(baseUrl + "&method=flickr.photos.getSizes",
                            function(getSizesData) {
                                var w=0, 
                                    h=0,
                                    img_url='',
                                    thumb_url='';
                                jQuery.each(getSizesData.sizes.size, function(i,item) {
                                    if (item.width > w) {
                                        w = item.width;
                                        h = item.height;
                                        img_url = item.source;
                                    }
                                    if (item.label == "Thumbnail") {
                                        thumb_url = item.source;
                                    }
                                });
                                var img;
                                jQuery('img').each(function() {
                                    if (RegExp("http://farm.*"+imageId).test(this.src)) {
                                        img = this;
                                    }
                                });
                                /* URL format http://farm{farm-id}.static.flickr.com/{server-id}/{id}_{secret}_[mtsb].jpg */
                                var sources = {
                                        "url": getInfoData.photo.urls.url[0]._content,
                                        "title": getInfoData.photo.title._content,
                                        "thumb": thumb_url,
                                        "image": img_url,
                                        "archive": "http://www.flickr.com/photos/" + getInfoData.photo.owner.nsid, /* owner's photostream */
                                        "image-metadata":"w"+w+"h"+h,
                                        "metadata-owner":getInfoData.photo.owner.realname ||undefined
                                    };

                                return callback( [{html:img, sources:sources}] );
                           });
                    });
            });
        },
        decorate:function(objs) {
        }
    },
    "thlib.org": {
        /*e.g. those on http://www.thlib.org/places/monasteries/meru-nyingpa/murals/ */
        find:function(callback) {
            var myloc = window.frames["gallery"].location.href; 
            var matches =  myloc.match(/(.*)\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);/*split last 3 "/" */
            if(typeof(myloc) == "string" && matches[4] != "gallery.html") { 
                var img_key = matches[3];
                var img_root = matches[1];
                var tile_root = img_root+"/source/"+img_key+"/"+img_key;
                var thumb = img_root+"/preview/"+img_key.toLowerCase()+".jpg";
                var img = document.createElement("img");
                img.src = tile_root+"/TileGroup0/0-0-0.jpg";
                var sources = {
                    "title":img_key,
                    "archive":String(document.location),
                    /*must be unique, but no good return link :-(*/
                    "url":tile_root+".htm", 
                    "xyztile":tile_root + "/TileGroup0/${z}-${x}-${y}.jpg",
                    "image-metadata":"w"+img.width+"h"+img.height,
                    "thumb":thumb,
                    "image":img.src /*nothing bigger available*/
                };
                /*do a query to see what the full dimensions are of the tiles
                  but instead of this hack what about using 
                  img_root+"/source/"+img_key+"/"+img_key+"/ImageProperties.xml"
                 */
                jQuery.get(tile_root+"/ImageProperties.xml",null,function(dir) {
                    /*was for url = tile_root+"/TileGroup0/" parsing:
                    var zooms = dir.split("\">").reverse()[3].match(/\d+/);
                    var exp = Math.pow(2,zooms);
                    sources["xyztile-metadata"] = "w"+(img.width*exp)+"h"+(img.height*exp);
                    */
                    var sizes = dir.match(/WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/);
                    sources["xyztile-metadata"] = "w"+(sizes[1])+"h"+(sizes[2]);
                    callback( [{"html": window.frames["gallery"].document["Zoomify Dynamic Flash"], 
                                "sources": sources
                               } ]);
                },"text");
            } else callback([]);
        },
        decorate:function(objs) {
        }
    },
    "vietnamwararchive.ccnmtl.columbia.edu": {
        single:function() {
            return (document.location.pathname.search("/record/display") == 0);
        },
        find:function(callback) {
            var rv = [];
            if (this.single()) 
                rv = [ this.update() ];
            callback(rv);
        },
        decorate:function(objs) {
        },
        update:function(obj) {
            var hash = false;
            var embs = document.getElementsByTagName("embed");
            if (embs.length) {
                var e = embs[0];
                if (e && e.Stop) {
                    try{
                        e.Stop();
                        hash = "start="+Math.floor(e.GetTime()/e.GetTimeScale());
                    } finally{}
                }
            }
            var thumb;
            if (SHARETHIS 
                && typeof SHARETHIS.shareables == "object"
                && SHARETHIS.shareables.length
               ) {
                thumb = SHARETHIS.shareables[0].properties.icon;
            }
            return {"html":$(".media").get(0),
                    "hash": hash||undefined,
                    "sources":{
                        "title":document.title,
                        "quicktime":$(".media").media("api").options.src,
                        "poster":$(".media img").get(0).src,
                        "thumb": thumb
                    }
                   };
        }
    },
    "youtube.com": {
        find:function(callback) {
            var video = document.getElementById("movie_player");
            if (video && video != null) {
                function getTitle(VIDEO_ID) {
                    var raw_title = '';
                    if (/www.youtube.com\/watch/.test(document.location)) {
                        raw_title = document.getElementsByTagName("h1")[0].textContent;
                    } else {
                        var for_channels = document.getElementById("playnav-curvideo-title");
                        if (for_channels != null) {
                            raw_title = document.getElementById("playnav-curvideo-title").textContent
                        }
                    }
                    return raw_title.replace(/^\s*/,"").replace(/\s*$/,"");
                }
                function getThumb(VIDEO_ID) {
                    var tries = [/*last-first*/
                        [document.getElementById("playnav-video-play-uploads-0-"+VIDEO_ID)],
                        goog.dom.getElementsByTagNameAndClass("div","playnav-item-selected"),
                        goog.dom.getElementsByTagNameAndClass("div","watch-playlist-row-playing")
                    ]; var i=tries.length;
                    while (--i >= 0) {
                        if (tries[i].length && tries[i][0] != null) {
                            return tries[i][0].getElementsByTagName("img")[0].src;
                        }
                    }
                    var try_embed = video.getAttribute('flashvars').match(/thumbnailUrl=([^&?]*)/);
                    if (try_embed) {
                        return unescape(try_embed[1]);
                    }
                    return undefined;
                }
                var VIDEO_ID = video.getVideoUrl().match(/[?&]v=([^&]*)/)[1];
                video.pauseVideo();
                var obj = {
                    "html":video,
                    "hash":"start="+video.getCurrentTime(),
                    "disabled":video.getVideoEmbedCode() == "",
                    "sources":{
                        "title":getTitle(VIDEO_ID),
                        "thumb":getThumb(VIDEO_ID),
                        "url":"http://www.youtube.com/watch?v="+VIDEO_ID,
                        "youtube":"http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1",
                        "gdata":"http://gdata.youtube.com/feeds/api/videos/"+VIDEO_ID
                    }
                };
                if (video.getCurrentTime() == video.getDuration()) 
                    delete obj.hash;
                return callback([obj]);

            } else callback([]);
        },
        decorate:function(objs) {
        }
    }
  },/*end hosthandler*/
  "assethandler":{
      /* assumes jQuery is available */
      "embeds": {
          players:{
              "youtube":{
                  match:function(emb) {
                      return String(emb.src).match(/^http:\/\/www.youtube.com\/v\/([\w-]*)/);
                  },
                  asset:function(emb,match,index,optional_callback) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var VIDEO_ID = match[1]; //e.g. "LPHEvaNjdhw"
                      var rv = {
                          html:emb,
                          wait:true,
                          sources: {
                              "title":'Youtube video',//guessed
                              "youtube":"http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1",
                              "gdata":'http://gdata.youtube.com/feeds/api/videos/'+VIDEO_ID
                          }};
                      var yt_callback = 'sherd_youtube_callback_'+index;
                      window[yt_callback] = function(yt_data) {
                          var e = yt_data['entry'];
                          rv.sources['title'] = e.title['$t'];
                          var th = e['media$group']['media$thumbnail'][0];
                          rv.sources['thumb'] = th.url;
                          rv.sources['thumb-metadata'] = "w"+th.width+"h"+th.height;
                          
                          rv.metadata = {
                              'description':e.content['$t'],
                              'author':e.author[0].name,
                              'author_uri':e.author[0].uri,
                              'youtube_link':'http://www.youtube.com/watch?v='+VIDEO_ID
                          };
                          if (e['media$group']['media$category'].length) {
                              rv.metadata['category']=e['media$group']['media$category'][0].label;
                          }
                          optional_callback(index, rv);
                      }
                      jQ.ajax({
                          url: rv.sources.gdata+'?v=2&alt=json-in-script&callback='+yt_callback,
                          dataType: 'script',
                          error:function(){optional_callback(index);}
                      });
                      /*use http://gdata.youtube.com/feeds/api/videos/?q=KP-nVpOLW88&v=2&alt=json-in-script&callback=myFunction
                        so we need to pass in the callback stuff here.
                        http://code.google.com/apis/youtube/2.0/reference.html#Searching_for_videos
                       */
                      return rv;
                  }
              }/*end youtube embeds*/
          },
          find:function(callback) {
              var result = [];
              var embeds = document.getElementsByTagName("embed");
              var waiting = 0;
              for (var i=0;i<embeds.length;i++) {
                  var emb = embeds[i];
                  function finished(index, asset_result) {
                      result[index] = asset_result || result[index];
                      if (--waiting <= 0) {
                          callback(result);
                      }
                  }
                  for (p in this.players) {
                      var m = this.players[p].match(emb);
                      if (m != null) {
                          var res = this.players[p].asset(emb, m, result.length, finished);
                          result.push(res);
                          if (res.wait) {
                              ++waiting;
                          }
                          break;
                      }
                  }
              }
              if (waiting==0)
                  callback(result);
          }
      },
      "objects": {
          players:{
              "flowplayer3":{
                  match:function(obj) {
                      if (obj.data) {
                          return String(obj.data).match(/flowplayer-3[.\d]+\.swf/);
                      } else {//IE7 ?+
                          var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                          return String(jQ('param[name=movie]',obj).get(0).value).match(/flowplayer-3[.\d]+\.swf/);
                      }
                  },
                  asset:function(obj,match,context) {
                      /* TODO: 1. support audio
                               2. 
                       */
                      var sources = {};
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var $f = (context.window.$f && context.window.$f(obj.parentNode));
                      
                      var cfg = (($f)? $f.getConfig() 
                                 :jQ.parseJSON(jQ('param[name=flashvars]').get(0)
                                               .value.substr(7)));//config=
                      //getClip() works if someone's already clicked Play
                      var clip = ($f && $f.getClip() ) || cfg.clip || cfg.playlist[0];
                      var type = 'video';
                      if (cfg.playlist && (! clip.url || cfg.playlist.length > 1)) {
                          for (var i=0;i<cfg.playlist.length;i++) {
                              var p = cfg.playlist[i];
                              var url = (typeof p=='string') ? p : p.url;
                              if (/\.(jpg|jpeg|png|gif)/.test(url)) {
                                  //wasteful, but useful
                                  sources.image = url;
                                  sources.thumb = url;
                                  sources.poster = url;
                                  if (p.width) {
                                      sources['image-metadata'] = "w"+p.width+"h"+p.height;
                                  }
                                  continue;
                              } 
                              else if (!clip.type || clip.type == 'image') {
                                  if (/\.flv$/.test(url)) {
                                      clip = p;
                                      type = 'flv';
                                      break;
                                  } else if (/\.mp4$/.test(url)) {
                                      clip = p;
                                      type = 'mp4';
                                      break;
                                  }
                              }
                          }
                      }
                      function get_provider(c) {
                          if (c.provider && cfg.plugins[c.provider]) {
                              var plugin = cfg.plugins[c.provider].url;
                              if (/pseudostreaming/.test(plugin)) {
                                  return '_pseudo';
                              } else if (/rtmp/.test(plugin)) {
                                  return '_rtmp';
                              }
                          } 
                          return '';
                      }
                      var primary_type = type+get_provider(clip);
                      sources[primary_type] = clip.originalUrl || clip.url || clip;
                      //guess is just the filename
                      sources['title'] = sources[primary_type].split('/').pop();
                      if (clip.width) {
                          sources[primary_type+"-metadata"] = "w"+clip.width+"h"+clip.height;
                      }
                      return sources;
                  }
              }/*end flowplayer3*/
          },
          find:function(callback,context) {
              var result = [];
              var objects = context.document.getElementsByTagName("object");
              for (var i=0;i<objects.length;i++) {
                  var emb = objects[i];
                  if (emb.getElementsByTagName("embed").length > 0) {
                      continue; //use embed
                  }
                  for (p in this.players) {
                      var m = this.players[p].match(emb);
                      if (m != null) {
                          result.push({html:emb,
                                       sources:this.players[p].asset(emb,m,context)
                                      });
                          break;
                      }
                  }
              }
              callback(result);
          }
      },
      "image": {
          find:function(callback,context) {
              var imgs = context.document.getElementsByTagName("img");
              var result = [];
              for (var i=0;i<imgs.length;i++) {
                  /*use offsetWidth, so display:none's are excluded */
                  if (imgs[i].offsetWidth > 400 || imgs[i].offsetHeight > 400) {
                      result.push({
                          "html":imgs[i],
                          "sources": {
                              "title":imgs[i].title || "",
                              "image":imgs[i].src,
                              "image-metadata":"w"+imgs[i].width+"h"+imgs[i].height
                          }
                      });
                  }
              }
              callback(result);
          }
      }
      /*,"mediathread": {
          ///the better we get on more generic things, the more redundant this will be
          ///BUT it might have more metadata
          find:function(callback) {
              var result = [];
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              jQ('div.asset-links').each(function(){
                  var sources = {};
                  var top = this;
                  jQ('a.assetsource',top).each(function() {
                      var reg = String(this.getAttribute("class")).match(/assetlabel-(\w+)/);
                      if (reg != null) {
                          ///use getAttribute rather than href, to avoid urlencodings
                          sources[reg[1]] = this.getAttribute("href");
                          if (this.title) 
                              sources.title = this.title;
                      }
                  });
                  result.push({
                      html:top,
                      sources:sources
                  });
              });
              return callback(result);
          }
      }/* end mediathread */
  },/*end assethandler*/
  "gethosthandler":function() {
      var hosthandler = SherdBookmarklet.hosthandler;
      if (document.location.hostname in hosthandler) {
          return hosthandler[document.location.hostname];
      } else if (document.location.hostname.slice(4) in hosthandler) {
          /*for www. domains */
          return hosthandler[document.location.hostname.slice(4)];
      }
  },/*gethosthandler*/
  "obj2url": function(host_url,obj) {
    /*excluding metadata because too short for GET string*/
    if (!obj.sources["url"]) obj.sources["url"] = document.location;
    var destination =  host_url;
    for (a in obj.sources) {
        if (typeof obj.sources[a] =="undefined") continue;
	destination += ( a+"="+escape(obj.sources[a]) +"&" );
    }
    if (obj.hash) {
        destination += "#"+obj.hash;
    }
    return destination;
  },/*obj2url*/
  "obj2form": function(host_url,obj) {
      if (!obj.sources["url"]) obj.sources["url"] = document.location;
      var destination =  host_url;
      var form = document.createElement("form");
      form.appendChild(document.createElement("span"));
      form.action = destination;
      form.target = '_top';
      var ready = SherdBookmarklet.user_status.ready;
      form.method = (ready) ? 'POST' : 'GET'; 
      /* just auto-save immediately
       * this also allows us to send larger amounts of metadata
       */
      for (a in obj.sources) {
          if (typeof obj.sources[a] =="undefined") continue;
          var span = document.createElement("span");
          var item = document.createElement("input");
          if (a=="title") {
              item.type = "text";
              item.setAttribute("style", "display:block;width:90%");
          } else {
              item.type = "hidden";
          }
          item.name = a;
          item.value = obj.sources[a];
          form.appendChild(span);
          form.appendChild(item);
      }
      if (ready && obj.metadata) {
          for (var i=0;i<obj.metadata.length;i++) {
              var item = document.createElement("input");
              item.type = "hidden"
              item.name = "metadata-"+obj.metadata[i][0];
              item.value = obj.metadata[i][1];
              form.appendChild(item);
          }
      }
      form.appendChild(document.createElement("span"));
      return form;
  },/*obj2url*/
  "runners": {
    jump: function(host_url,jump_now) {
        var final_url = host_url;
        var M = SherdBookmarklet;
        var handler = M.gethosthandler();
        if (!handler) {
            M.run_with_jquery(function(jQuery) {
                M.g = new M.Grabber(host_url);
                M.g.findAssets();
            });
            return;
        }
        var jump_with_first_asset = function(assets,error) {
            switch (assets.length) {
            case 0: 
                var message = error||"This page does not contain an asset. Try going to an asset page.";
                return alert(message);
            case 1:
                if (assets[0].disabled)
                    return alert("This asset cannot be embedded on external sites. Please select another asset.");

                if (jump_now && !M.debug) {
                    document.location = M.obj2url(host_url, assets[0]);
                }
            }
            if (window.console) {/*if we get here, we're debugging*/
                window.console.log(assets);
            }
        };
        handler.find.call(handler, jump_with_first_asset);
    },
    decorate: function(host_url) {
        var M = SherdBookmarklet;
        function go(run_func) {
            M.run_with_jquery(function() {
                M.g = new M.Grabber(host_url);
                if (run_func=='onclick') M.g.findAssets();
            });
        }
        /*ffox 3.6+ and all other browsers:*/
        if (document.readyState != "complete") {
            /*future, auto-embed use-case.
              When we do this, we need to support ffox 3.5-
             */
            M.l = M.connect(window,"load",go);
        } else {/*using as bookmarklet*/
            go('onclick');
        }
    }
  },/*runners*/
  "connect":function (dom,event,func) {
      try {
          return ((dom.addEventListener)? dom.addEventListener(event,func,false) : dom.attachEvent("on"+event,func));
      } catch(e) {/*dom is null in firefox?*/}
  },/*connect*/
  "hasClass":function (elem,cls) {
      return (" " + (elem.className || elem.getAttribute("class")) + " ").indexOf(cls) > -1;
  },
  "Grabber" : function (host_url, page_handler, options) {
      this.hasBody = function(doc) {
          return ('body'==doc.body.tagName.toLowerCase());
      }
      this.options = {
          tab_label:"Analyze in Mediathread",
          target:((this.hasBody(document))? document.body : null),
          top:"100px",
          side:"left",
          fixed:true
      }; if (options) for (a in options) {this.options[a]=options[a]};
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );

      var o = this.options;
      var M = SherdBookmarklet;
      var self = this;
      var comp = this.components = {};

      this.onclick = function(evt) {
          if (self.windowStatus) return;
          self.showWindow();
          self.findAssets();
      };

      this.showWindow = function() {
          self.windowStatus = true;
          if (comp.window) {
              comp.window.style.display = "block";
              comp.tab.style.display = "none";
              comp.ul.innerHTML = "";
          }
      };
      this.setupContent = function(target) {
          comp.top = target.ownerDocument.createElement("div");
          comp.top.setAttribute("class","sherd-analyzer");
          target.appendChild(comp.top);
          comp.top.innerHTML = "<div class=\"sherd-tab\" style=\"display:block;position:absolute;"+o.side+":0px;z-index:9998;height:2.5em;top:"+o.top+";color:black;font-weight:bold;margin:0;padding:5px;border:3px solid black;text-align:center;background-color:#cccccc;text-decoration:underline;cursor:pointer;\">"+o.tab_label+"</div><div class=\"sherd-window\" style=\"display:none;position:absolute;z-index:9999;top:0;width:400px;height:400px;overflow:hidden;border:3px solid black;background-color:#cccccc\"><div class=\"sherd-window-inner\" style=\"overflow-y:auto;width:384px;height:390px;margin:1px;padding:0 6px 6px 6px;border:1px solid black;\"><button class=\"sherd-close\" style=\"float:right;\">close</button><button class=\"sherd-move\" style=\"float:right;\">move</button><h2>Assets on this Page</h2><p class=\"sherd-message\">Searching for assets....</p><ul></ul></div></div>";
          comp.tab = comp.top.firstChild;
          comp.window = comp.top.lastChild;
          comp.ul = comp.top.getElementsByTagName("ul")[0];
          comp.close = comp.top.getElementsByTagName("button")[0];
          comp.move = comp.top.getElementsByTagName("button")[1];
          comp.message = comp.top.getElementsByTagName("p")[0];
          M.connect(comp.tab, "click", this.onclick);
          M.connect(comp.move, "click", function(evt) {
              var s = comp.window.style;
              s.left = s.right = s.top = s.bottom = null;
              s.right = '0px';
              s.top = '0px';
          });
          M.connect(comp.close, "click", function(evt) {
              comp.window.style.display = "none";
              comp.tab.style.display = "block";
              self.windowStatus = false;
          });
      };
      if (o.target) {
          this.setupContent(o.target);
      }

      this.handler_count = 0;
      this.assets_found = [];
      this.findAssets = function() {
          var handler = SherdBookmarklet.gethosthandler();
          if (handler) {
              handler.find.call(handler, self.collectAssets);
          } else {
              handler = SherdBookmarklet.assethandler;
              var frames = self.walkFrames();
              if (!comp.window && frames.best) {
                  var target = o.target || frames.best.document.body;
                  self.setupContent(target);
                  self.showWindow();
              }
              jQ(frames.all).each(function(i,context) {
                  for (h in SherdBookmarklet.assethandler) {
                      ++self.handler_count;
                  }
                  for (h in SherdBookmarklet.assethandler) {
                      try {
                          handler[h].find.call(handler[h],self.collectAssets,context);
                      } catch(e) {
                          --self.handler_count;
                          SherdBookmarklet.error = e;
                          alert("Bookmarklet Error: "+e.message);
                      }
                  }
              });
          }
      };
      this.collectAssets = function(assets,errors) {
          self.assets_found.push.apply(self.assets_found,assets);
          for (var i=0;i<assets.length;i++) {
              self.displayAsset(assets[i]);
          }
          --self.handler_count;
          if (self.handler_count==0) {
              self.finishedCollecting();
          }
      };
      this.displayAsset = function(asset) {
          var li = document.createElement("li");
          var jump_url = M.obj2url(host_url, asset);
          var form = M.obj2form(host_url, asset);
          var t = form.elements["title"];
          if (t && t.previousSibling) /*IE7 breaks here */
              t.previousSibling.innerHTML = "<div>Guessed title:</div>";
          var img = asset.sources.thumb || asset.sources.image;
          if (img) {
              form.firstChild.innerHTML = "<img src=\""+img+"\" style=\"width:20%;max-width:120px;max-height:120px;\" /> ";
          }
          form.lastChild.innerHTML = "<input type=\"submit\"  value=\"analyze\" />";
          li.appendChild(form);
          if (comp.ul) 
              comp.ul.appendChild(li);
      };
      this.finishedCollecting = function() {
          if (comp.message) {
              comp.message.innerHTML = "";/*erase searching message*/
              if (self.assets_found.length ==0) {
                  comp.ul.innerHTML = "<li>Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page.</li>";
              }
          }
      };
      this.walkFrames = function() {
          var rv = {all:[]}
          rv.all.unshift({frame:window, 
                          document:document,
                          window:window,
                          hasBody:self.hasBody(document)});
          var max =(rv.all[0].hasBody *document.body.offsetWidth *document.body.offsetHeight) || 0;
          rv.best = ((max)? rv.all[0] : null);
          function _walk(index,domElement) {
              try {
                  var doc = this.contentDocument||this.contentWindow.document;
                  doc.getElementsByTagName('frame');//if this fails, security issue
                  var context = {
                      frame:this,document:doc,
                      window:this.contentWindow,
                      hasBody:self.hasBody(doc)
                  };
                  rv.all.push(context);
                  var area = self.hasBody(doc) * this.offsetWidth * this.offsetHeight;
                  if (area > max) {
                      rv.best = context;
                  }
                  jQ('frame',doc).each(_walk);
              } catch(e) {/*probably security error*/}
          }
          jQ('frame').each(_walk);
          return rv;
      }

  }/*Grabber*/
};/*SherdBookmarklet (root)*/

window.MondrianBookmarklet = SherdBookmarklet; //legacy name
if (!window.SherdBookmarkletOptions) {
    window.SherdBookmarkletOptions = {};
}

if (!SherdBookmarkletOptions.decorate) {
    var o = SherdBookmarkletOptions;
    var host_url = o.host_url || o.mondrian_url;//legacy name
    SherdBookmarklet.options = o;
    SherdBookmarklet.debug = o.debug;
    SherdBookmarklet.runners[o.action](host_url,true);
} else {
    var scripts = document.getElementsByTagName("script");
    var i = scripts.length;
    while (--i >= 0) {
        var me_embedded = scripts[i];
        if (/bookmarklets\/analyze.js/.test(me_embedded.src)) {
            var sbo = window.SherdBookmarkletOptions;
            sbo.host_url=String(me_embedded.src).split("/",3).join("/")+"/save/?";
            sbo.action = "decorate";
            
            SherdBookmarklet.runners[sbo.action](sbo.host_url,true);
            break;
        }
    }
}
