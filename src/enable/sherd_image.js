/***owned by Tibetan Civilization project, at the moment
****/
jQuery(function(){
    var destination = 'http://sky.ccnmtl.columbia.edu:8000/save/?';
    var img_file = jQuery('img').get(2).src;
    var img_base = String(img_file).match(/images\/([^.]+)\./)[1];
    var site_base = String(document.location).match(/(.*?)image/)[1];
    var args = {
	'title':jQuery('#node-main h2.title').get(0).innerHTML,
	'url':document.location,
	'thumb':site_base+'files/tibet/images/'+img_base+'.thumbnail.JPG',
	'xyztile':site_base+'files/tibet/tiles/'+img_base+'/z${z}/y${y}/x${x}.png',
	'image':img_file,
	'archive':site_base
    }
    for (a in args) {
	destination += ( a+'='+args[a] +'&' );
    }

    jQuery('.byxor-control-slot div').prepend('<h2 style="display:block;float:left;margin:-2px 5px 0 5px;padding:0 5px 0 5px;background-color:white"><a href="'+destination+'" style="color:black;">Analyze This</a></h2>');

});


/*
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monastery&thumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPG&xyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/&image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG&

example:
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monasterythumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPGxyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG


*/