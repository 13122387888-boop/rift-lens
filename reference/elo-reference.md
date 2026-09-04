# 原站 ELO 参考表

来源：https://a.lzyumi.top/ ，采集于 2026-09-03。表格位于保存页面第 5242–5250 行。每档起点按含下限、不含下一档下限解释；2800 以上只写大师及以上，不推导宗师/王者或 LP。原站图表 formatter 的个别边界比较与表格不一致，本站明确沿用展示的对照表。

模式入口：原站只提供全部、匹配、大乱斗、排位、灵活等筛选，没有单独的海克斯筛选。海克斯在已观察响应中的 title 前缀为海斗，详情 gameMode 为 KIWI。新入口使用原站公开的全部筛选，在最近 30 场内选取海斗记录，不猜测后端筛选编号。普通大乱斗摘要不作为海克斯 ELO。

		var currentDateRankElo = new Date(); 
		var signMonthRankElo = currentDateRankElo.getMonth() + 1 +'';
		var signDayRankElo = currentDateRankElo.getDate()+'';
		var signHoursRankElo = currentDateRankElo.getHours()+'';
		var signMinutesRankElo = currentDateRankElo.getMinutes()+'';
		var signSecondsRankElo = currentDateRankElo.getSeconds()+'';
		var lzyumiSignRankElo = md5Sign(signMonthRankElo,signDayRankElo,signHoursRankElo,signMinutesRankElo,signSecondsRankElo)
		
		var signStrRankElo = signMonthRankElo+signDayRankElo+signHoursRankElo+signMinutesRankElo+signSecondsRankElo + signMonthRankElo.length* 3 +''  + signDayRankElo.length* 3+''+signHoursRankElo.length* 3+''+signMinutesRankElo.length* 3+''+signSecondsRankElo.length* 3
		dataRankElo =  dataRankElo + '&lzyumiSign='+lzyumiSignRankElo+ '&signStr='+signStrRankElo
		var filternow = $("#filter").val() || 2
		var urlRankEloInfo = baseUrl + '/getRankEloInfo';
		axios.get(urlRankEloInfo +  dataRankElo+ '&filter=' + filternow)
		.then(function(resp) {
			var eloInfo = resp.data.data
			var eloNum = eloInfo.dataRankEloNum
			$("[id='elospanId']").html('('+(eloNum.replace("大乱斗：","").replace("灵活：","").replace("单双：","")) +')') 
				var eloRankNum = eloInfo.dataRankEloInfoB || '-'
				var dldEloNum = eloInfo.dataRankEloInfoA || '-'
				var ppEloNum = eloInfo.dataRankEloPp || '-'
				var eloInfohtml = '<div><levelp style="color: brown;">'
				eloInfohtml = eloInfohtml + eloNum  + '</levelp><br><levelp style="color: brown;">'
				eloInfohtml = eloInfohtml + dldEloNum  + '</levelp><br><levelp style="color: brown;">'
				eloInfohtml = eloInfohtml + eloRankNum  + '</levelp><br><levelp style="color: brown;">'
				eloInfohtml = eloInfohtml + ppEloNum  + '</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>对照表：<br></levelp>'
				eloInfohtml = eloInfohtml + '<levelp>黑铁Ⅳ——黑铁Ⅰ：0，100，200，300</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>青铜Ⅳ——青铜Ⅰ：400，500，600，700</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>白银Ⅳ——白银Ⅰ：800，900，1000，1100</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>黄金Ⅳ——黄金Ⅰ：1200，1300，1400，1500</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>铂金Ⅳ——铂金Ⅰ：1600，1700，1800，1900</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>翡翠Ⅳ——翡翠Ⅰ：2000，2100，2200，2300</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>砖石Ⅳ——砖石Ⅰ：2400，2500，2600，2700</levelp><br>'
				eloInfohtml = eloInfohtml + '<levelp>大师及以上：2800</levelp>'
				eloInfohtml = eloInfohtml + '<a onclick="hidenEloInfohtml()" class="floater-close" style="z-index: 104;"><i class="floater-close-icon"></i></a></div>'