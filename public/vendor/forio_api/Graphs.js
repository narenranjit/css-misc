F.GraphUtils = function(){
	var getSeriesVariables = function(series, options){
		var defaults = {
			compile: true
		}
		$.extend(defaults, options);
		
		var variableList= [];
		
		for(var i=0; i<series.length; i++){
			var thisseries = series[i];
			
			for(var j=0; j< thisseries.data.length; j++){
				var item = thisseries.data[j];
				if(F.isString(item) && !F.Array.contains(item, variableList)){
					var templatedName = (defaults.compile) ? F.Template.compile(item) : item;
					variableList.push(item);
				}
				else if(F.isObject(item) && F.isString(item.y) && !F.Array.contains(item.y, variableList)){
					var templatedName = (defaults.compile) ? F.Template.compile(item.y): item.y;
					variableList.push(templatedName);
				}
			}
		}
		return variableList;
	};
	
	var getDataForSeries = function(variableList, callback){
		if(!variableList || variableList.length === 0){
			callback([]);
		}
		else{
			F.API.Run.getValues(variableList, function(run){
				var runValues = run.values;
				//console.log("api", runValues)
				callback(runValues) ;
			});
		}
	};
	
	var unifySeriesData = function(runValues, ipSeries, callback){
		var series = F.Array.copy(ipSeries);

		for(var i=0; i<series.length; i++){
			var thisseries = series[i];
				thisseries.dataFormatted = [];
			for(var j=0; j< thisseries.data.length; j++){
				var item = thisseries.data[j];
				if(F.isString(item)){
					var itemName = F.Template.compile(item).toLowerCase();
					thisseries.data[j] = parseFloat(runValues[itemName].resultFormatted.replace("%", "").replace("$", ""));
					thisseries.dataFormatted[j] = runValues[itemName].resultFormatted;
				}
				else if(F.isObject(item) && F.isString(item.y)){
					var itemName = F.Template.compile(item.y).toLowerCase();
					var val =  (itemName && runValues[itemName]) ?
										runValues[itemName].resultFormatted.replace("%", "").replace("$", "") :
										itemName;
					item.y = val;
					thisseries.data[j] = item;
				}
			}
			series[i] = thisseries;
		}
		return series;
	};
	
	return{
		getSeriesVariables: getSeriesVariables,
		populateSeries: function(series, callback){
			var variableList = getSeriesVariables(series);
			getDataForSeries(variableList, function(runValues){
				var populatedSeries = unifySeriesData(runValues, series);
//				console.log("populatedSeries", populatedSeries, "runvals", runValues)
				callback(populatedSeries);
			});
		}
	};
}();

var FChartList = {};

var FChart = function(options){
	var hc, model, isDataURL;

	var defaultOptions = {
		title: {
      style:{
        fontFamily: 'verdana',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#555555'
      }
    },
    tooltip: {
      formatter: function() {
        return this.series.name +': '+ this.y +'<br/>';
      }
    },
    credits:{
	    enabled:false
	  },
    series: []
	};

	$.extend(true, defaultOptions, options);
	
	isDataURL = (defaultOptions.seriesURL) ? true: false;
	
	var defaultseries = $.extend(true, [], defaultOptions.series);
	var model = $.extend(true, [], defaultseries);

	function draw(callback){
		if(isDataURL){
			var ac = new AjaxConnection(defaultOptions.seriesURL);
		      ac.getJSON("", function(res){
		        res = $.parseJSON(F.String.clean(res));
		        callback(res);
      });
		}
		else{
			F.GraphUtils.populateSeries(model, callback);
		}
	}
	
	draw(function(series){
		defaultOptions.series = series;
		//console.log(defaultOptions.series);
		var target = "#"  + defaultOptions.chart.renderTo;
		hc = new Highcharts.Chart(defaultOptions);
	});
	
	
	return{
		chart: hc,
		redrawPoint: function(itemname, val, callback){
			for(var i=0; i<hc.series.length; i++){
				var thisseries = hc.series[i];
				var olddata = thisseries.data;
				
				var newdata = []
				for(var j=0; j< olddata.length; j++){
					//console.log(olddata[j]);
					var thisObj = {
						name: olddata[j].name,
						color: olddata[j].color,
						y: olddata[j].y
					}
//					console.log(thisObj, thisObj.name, itemname)
					if(thisObj.name === itemname){
						thisObj.y = val;
					}
					newdata.push(thisObj);
				}
				 hc.series[i].setData(newdata, true)
			}
		},
		redraw: function(series, callback){
			var populate = function(series){
				var dirty = false;
				for(var i=0; i< series.length; i++){
					if(!F.Array.areEqual(series[i].data, hc.series[i].data)){
						hc.series[i].setData(series[i].data, false);
						dirty = true;
					}
				}
				if(dirty){
					hc.redraw();
				}
			}
			
			if(!series){
				draw(populate);
			}
			else{
				populate(series);
			}
			
			
		},
		getModel: function(){
			var cleanedModel = F.GraphUtils.getSeriesVariables(model, {compile: false});
			return cleanedModel;
		},
		getDataset: function(){
			var dSet = {}
			for(var i=0; i<hc.series.length; i++){
				var thisseries = hc.series[i];
				var olddata = thisseries.data;
				for(var j=0; j< olddata.length; j++){
					//console.log(olddata[j]);
					dSet[olddata[j].name] = olddata[j].y;
				}
			}
			//console.log(dSet)
		},
		update: function(changedValues){
			
		}
	};
};

var FStackedColumn = function(container, options){
	var defaultOptions = {
		chart: {
			renderTo: container,
			defaultSeriesType: 'column'
		},
		legend:{
			enabled:false
	    },
		xAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		},
		yAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		}
		
	};

	$.extend(true, defaultOptions, options);
	
	var fc = new FChart(defaultOptions);
	return fc;
}

var FBar = function(container, options){
	var defaultOptions = {
		chart: {
			renderTo: container,
			defaultSeriesType: 'bar'
        },
	    legend:{
			enabled:false
	    },
		plotOptions: {
			series: {
				borderWidth: 0,
				shadow: false
			}
		},
		xAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		},
		yAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		}
	};

	$.extend(true, defaultOptions, options);
	
	var fc = new FChart(defaultOptions);
	FChartList[container] = fc;
	return fc;
}

var FLine = function(container, options){
	var defaultOptions = {
		chart: {
			renderTo: container,
			defaultSeriesType: 'line'
		},
		legend:{
			enabled:false
		},
		xAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		},
		yAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		}
	};
	
	$.extend(true, defaultOptions, options);
	
	var fc = new FChart(defaultOptions);
	return fc;
}

var FPie = function(container, options){
	var defaultOptions = {
		chart: {
			renderTo: container,
			defaultSeriesType: 'pie'
		},
		legend:{
			enabled:false
		},
		xAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		},
		yAxis:{
			lineColor: '#ababab', 
			lineWidth: 1,
			gridLineColor:'#FFFFFF',
			tickWidth: 0
		}
	};

	$.extend(true, defaultOptions, options);
	
	var fc = new FChart(defaultOptions);
	return fc;
}


var FColumn = function(container, options){
	var defaultOptions = {
		 chart: {
		 	renderTo: container,
            defaultSeriesType: "column"
        },
         legend:{
			enabled:false
	    },
        yAxis: {
          title: {
            text: ''
          },
          labels: {
            enabled: false
          },
          gridLineColor:'#CCCCCC'
        },
        plotOptions: { 
        	series: {
				borderWidth: 0,
				shadow: false
			},
          column: {
            stacking: 'normal'
          }
        }, 
        tooltip: {
          formatter: function() { return this.y + "%"; }
        },         
        colors: ['#ffbf59', '#ffbf59', '#ffbf59', '#ffbf59']
	}
	$.extend(true, defaultOptions, options);
	var fc = new FChart(defaultOptions);
	return fc;
}

var FTornado = function(container, options){
	var defaultOptions = {
		title: " ",
		chart: {
			renderTo: container,
			 height: 190,
			defaultSeriesType: 'bar',
      marginTop: 0,
      marginBottom: 0
		},
    yAxis: {
      title: {
          text: ''
      },
      labels: {
          enabled: false 
      },
      lineColor: "#FFF",
      gridLineColor: "#CCC",
      gridLineWidth: 1,
      min: -100,
      max: 100
    },
    xAxis: {
      labels: {
        enabled: false 
      },
      lineColor: "#FFF"        
    },
    
    plotOptions: {
       bar: {
          dataLabels: {
             enabled: true
          }
       },
       series: {
         dataLabels: {
           enabled: true,
           formatter: function() {
             this.series.options.dataLabels.x = (this.y <= 0 ? -32 : 12);
             return this.y +'%';
           }
         },
         animation: {
           duration: 2000
         },
         groupPadding: 0,
         pointPadding: 0.05
       }
    },
    tooltip: {
       formatter: function() {
         return this.point.name +': '+ this.y +'<br/>';
       }
    }
	}
	$.extend(true, defaultOptions, options);
	
	//var fc = new Highcharts.Chart(defaultOptions);
	var fc = new FBar(container, defaultOptions);
	return fc;
}
