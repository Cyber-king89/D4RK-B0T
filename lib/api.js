const cheerio = require("cheerio");
const axios = require("axios");
const qs = require("qs");
const fetch = require("node-fetch");
const cookie = require("cookie");
const FormData = require("form-data");
const exec = require("child_process").exec;
const os = require("os");
const gtts = require("./gtts.js");
const igstalk = require("./igstalk.js")
const author = "Sachu-Settan"

async function post(url, formdata = {}, cookies) {
	let encode = encodeURIComponent;
	let body = Object.keys(formdata)
		.map((key) => {
			let vals = formdata[key];
			let isArray = Array.isArray(vals);
			let keys = encode(key + (isArray ? "[]" : ""));
			if (!isArray) vals = [vals];
			let out = [];
			for (let valq of vals) out.push(keys + "=" + encode(valq));
			return out.join("&");
		})
		.join("&");
	return await fetch(`${url}?${body}`, {
		method: "GET",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.9",
			"User-Agent": "GoogleBot",
			Cookie: cookies,
		},
	});
}

// Downloader
async function aiovideodl(link) {
	return new Promise((resolve, reject) => {
		axios({
			url: 'https://aiovideodl.ml/',
			method: 'GET',
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				"cookie": "PHPSESSID=69ce1f8034b1567b99297eee2396c308; _ga=GA1.2.1360894709.1632723147; _gid=GA1.2.1782417082.1635161653"
			}
		}).then((src) => {
			let a = cheerio.load(src.data)
			let token = a('#token').attr('value')
			axios({
				url: 'https://aiovideodl.ml/wp-json/aio-dl/video-data/',
				method: 'POST',
				headers: {
					"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					"cookie": "PHPSESSID=69ce1f8034b1567b99297eee2396c308; _ga=GA1.2.1360894709.1632723147; _gid=GA1.2.1782417082.1635161653"
				},
				data: new URLSearchParams(Object.entries({
					'url': link,
					'token': token
				}))
			}).then(({
				data
			}) => {
				resolve(data)
			})
		})
	})
}

// MediaFire
async function mediafire(url) {
	let query = await axios.get(url)
	let cher = cheerio.load(query.data)
	let hasil = []
	let link = cher('a#downloadButton').attr('href')
	let size = cher('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').replace('\n', '').replace('\n', '').replace(' ', '')
	let seplit = link.split('/')
	let name = seplit[5]
	let mime = name.split('.')
	mime = mime[1]
	hasil.push({
		author,
		name,
		mime,
		size,
		link
	})
	return hasil
}

// StyleText
async function styletext(teks) {
	return new Promise((resolve, reject) => {
		axios.get('http://qaz.wtf/u/convert.cgi?text=' + teks)
			.then(({
				data
			}) => {
				let $ = cheerio.load(data)
				let hasil = []
				$('table > tbody > tr').each(function(a, b) {
					hasil.push({
						author,
						name: $(b).find('td:nth-child(1) > span').text(),
						result: $(b).find('td:nth-child(2)').text().trim()
					})
				})
				resolve(hasil)
			})
	})
}

// TikTok Downloader
async function ttdownloader(url) {
	return new Promise(async (resolve, reject) => {
		axios.get('https://ttdownloader.com/', {
				headers: {
					"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
					"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					"cookie": "PHPSESSID=9ut8phujrprrmll6oc3bist01t; popCookie=1; _ga=GA1.2.1068750365.1625213061; _gid=GA1.2.842420949.1625213061"
				}
			})
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				let token = $('#token').attr('value')
				let config = {
					'url': url,
					'format': '',
					'token': token
				}
				axios('https://ttdownloader.com/req/', {
						method: 'POST',
						data: new URLSearchParams(Object.entries(config)),
						headers: {
							"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
							"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
							"cookie": "PHPSESSID=9ut8phujrprrmll6oc3bist01t; popCookie=1; _ga=GA1.2.1068750365.1625213061; _gid=GA1.2.842420949.1625213061"
						}
					})
					.then(({
						data
					}) => {
						const $ = cheerio.load(data)
						resolve({
							author,
							nowm: $('div:nth-child(2) > div.download > a').attr('href'),
							wm: $('div:nth-child(3) > div.download > a').attr('href'),
							audio: $('div:nth-child(4) > div.download > a').attr('href')
						})
					})
			})
			.catch(reject)
	})
}

// PlayStore
async function playstore(name) {
	return new Promise((resolve, reject) => {
		axios.get('https://play.google.com/store/search?q=' + name + '&c=apps')
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				let ln = [];
				let nm = [];
				let dv = [];
				let lm = [];
				const result = [];
				$('div.wXUyZd > a').each(function(a, b) {
					const link = 'https://play.google.com' + $(b).attr('href')
					ln.push(link);
				})
				$('div.b8cIId.ReQCgd.Q9MA7b > a > div').each(function(d, e) {
					const name = $(e).text().trim()
					nm.push(name);
				})
				$('div.b8cIId.ReQCgd.KoLSrc > a > div').each(function(f, g) {
					const dev = $(g).text().trim();
					dv.push(dev)
				})
				$('div.b8cIId.ReQCgd.KoLSrc > a').each(function(h, i) {
					const limk = 'https://play.google.com' + $(i).attr('href');
					lm.push(limk);
				})
				for (let i = 0; i < ln.length; i++) {
					result.push({
						author,
						name: nm[i],
						link: ln[i],
						developer: dv[i],
						link_dev: lm[i]
					})
				}
				resolve(result)
			})
			.catch(reject)
	})
}

// Search Group Whatsapp
async function linkwa(nama) {
	return new Promise((resolve, reject) => {
		axios.get('http://ngarang.com/link-grup-wa/daftar-link-grup-wa.php?search=' + nama + '&searchby=name')
			.then(({
				data
			}) => {
				const $ = cheerio.load(data);
				const result = [];
				const lnk = [];
				const nm = [];
				$('div.wa-chat-title-container').each(function(a, b) {
					const limk = $(b).find('a').attr('href');
					lnk.push(limk)
				})
				$('div.wa-chat-title-text').each(function(c, d) {
					const name = $(d).text();
					nm.push(name)
				})
				for (let i = 0; i < lnk.length; i++) {
					result.push({
						author,
						nama: nm[i].split('. ')[1],
						link: lnk[i].split('?')[0]
					})
				}
				resolve(result)
			})
			.catch(reject)
	})
}

// Instagram Downloader
async function igdl(url) {
	return new Promise(async (resolve, reject) => {
		axios.request({
				url: 'https://www.instagramsave.com/download-instagram-videos.php',
				method: 'GET',
				headers: {
					"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					"cookie": "PHPSESSID=ugpgvu6fgc4592jh7ht9d18v49; _ga=GA1.2.1126798330.1625045680; _gid=GA1.2.1475525047.1625045680; __gads=ID=92b58ed9ed58d147-221917af11ca0021:T=1625045679:RT=1625045679:S=ALNI_MYnQToDW3kOUClBGEzULNjeyAqOtg"
				}
			})
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				const token = $('#token').attr('value')
				let config = {
					headers: {
						'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
						"sec-ch-ua": '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
						"cookie": "PHPSESSID=ugpgvu6fgc4592jh7ht9d18v49; _ga=GA1.2.1126798330.1625045680; _gid=GA1.2.1475525047.1625045680; __gads=ID=92b58ed9ed58d147-221917af11ca0021:T=1625045679:RT=1625045679:S=ALNI_MYnQToDW3kOUClBGEzULNjeyAqOtg",
						"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					data: {
						'url': url,
						'action': 'post',
						'token': token
					}
				}
				axios.post('https://www.instagramsave.com/system/action.php', qs.stringify(config.data), {
						headers: config.headers
					})
					.then(({
						data
					}) => {
						resolve(data)
					})
			})
			.catch(reject)
	})
}

// Instagram Story
async function igstory(username) {
	return new Promise(async (resolve, reject) => {
		axios.request({
				url: 'https://www.instagramsave.com/instagram-story-downloader.php',
				method: 'GET',
				headers: {
					"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					"cookie": "PHPSESSID=ugpgvu6fgc4592jh7ht9d18v49; _ga=GA1.2.1126798330.1625045680; _gid=GA1.2.1475525047.1625045680; __gads=ID=92b58ed9ed58d147-221917af11ca0021:T=1625045679:RT=1625045679:S=ALNI_MYnQToDW3kOUClBGEzULNjeyAqOtg"
				}
			})
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				const token = $('#token').attr('value')
				let config = {
					headers: {
						'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
						"sec-ch-ua": '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
						"cookie": "PHPSESSID=ugpgvu6fgc4592jh7ht9d18v49; _ga=GA1.2.1126798330.1625045680; _gid=GA1.2.1475525047.1625045680; __gads=ID=92b58ed9ed58d147-221917af11ca0021:T=1625045679:RT=1625045679:S=ALNI_MYnQToDW3kOUClBGEzULNjeyAqOtg",
						"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					data: {
						'url': 'https://www.instagram.com/' + username,
						'action': 'story',
						'token': token
					}
				}
				axios.post('https://www.instagramsave.com/system/action.php', qs.stringify(config.data), {
						headers: config.headers
					})
					.then(({
						data
					}) => {
						resolve(data)
					})
			})
			.catch(reject)
	})
}

/**
 * TextPro Scraper
 * @function
 * @param {String} url - Your phootoxy url, example https://photooxy.com/logo-and-text-effects/make-tik-tok-text-effect-375.html.
 * @param {String[]} text - Text (required). example ["text", "text 2 if any"]
 */
async function textpro(url, text) {
	if (!/^https:\/\/textpro\.me\/.+\.html$/.test(url))
		throw new Error("Enter a Valid URL");
	const geturl = await fetch(url, {
		method: "GET",
		headers: {
			"User-Agent": "GoogleBot",
		},
	});
	const load_token = await geturl.text();
	let cookies = geturl.headers.get("set-cookie").split(",").map((v) => cookie.parse(v)).reduce((a, c) => {
		return {
			...a,
			...c
		};
	}, {});
	cookies = {
		__cfduid: cookies.__cfduid,
		PHPSESSID: cookies.PHPSESSID
	};
	cookies = Object.entries(cookies)
		.map(([name, value]) => cookie.serialize(name, value))
		.join("; ");
	const $ = cheerio.load(load_token);
	const token = $('input[name="token"]').attr("value");
	const form = new FormData();
	if (typeof text === "string") text = [text];
	for (let texts of text) form.append("text[]", texts);
	form.append("submit", "Go");
	form.append("token", token);
	form.append("build_server", "https://textpro.me");
	form.append("build_server_id", 1);
	const geturl2 = await fetch(url, {
		method: "POST",
		headers: {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.9",
			"User-Agent": "GoogleBot",
			Cookie: cookies,
			...form.getHeaders(),
		},
		body: form.getBuffer(),
	});
	const atoken = await geturl2.text();
	const token2 = /<div.*?id="form_value".+>(.*?)<\/div>/.exec(atoken);
	if (!token2) {
		var status_err = new Object();
		status_err.status = false
		status_err.error = "Error! This token is not acceptable!"
		return status_err;
	}
	const prosesimage = await post(
		"https://textpro.me/effect/create-image",
		JSON.parse(token2[1]),
		cookies
	);
	const image_ret = await prosesimage.json();
	return `https://textpro.me${image_ret.fullsize_image}`;
}

/**
 * Photooxy Scraper
 * @function
 * @param {String} url - Your phootoxy url, example https://photooxy.com/logo-and-text-effects/make-tik-tok-text-effect-375.html.
 * @param {String[]} text - Text (required). example ["text", "text 2 if any"]
 */
async function photooxy(url, text) {
	if (!/^https:\/\/photooxy\.com\/.+\.html$/.test(url)) {
		throw new Error("Enter a Valid URL");
	}
	let num = 0;
	const form = new FormData();
	if (typeof text === "string") text = [text];
	for (let texts of text) {
		num += 1;
		form.append(`text_${num}`, texts);
	}
	form.append("login", "OK");
	var procc = await fetch(url, {
		method: "POST",
		headers: {
			Accept: "/",
			"Accept-Language": "en-US,en;q=0.9",
			"User-Agent": "GoogleBot",
			...form.getHeaders(),
		},
		body: form.getBuffer(),
	});
	let html = await procc.text();
	let $ = cheerio.load(html);
	const img = $('a[class="btn btn-primary"]').attr("href");
	return img;
}

// List Top Server Minecraft Indonesia
async function servermc(paged) {
	if (paged) {
		bebed = `/` + paged + `/`
	} else if (!paged) {
		bebed = `/`
	}
	return new Promise((resolve, reject) => {
		axios.get(`https://minecraftpocket-servers.com/country/indonesia` + bebed).then(xzons => {
			const $ = cheerio.load(xzons.data)

			hasil = []

			$("tr").each(function(c, d) {
				ip = $(d).find("button.btn.btn-secondary.btn-sm").eq(1).text().trim().replace(':19132', '')
				port = '19132'
				versi = $(d).find("a.btn.btn-info.btn-sm").text()
				player = $(d).find("td.d-none.d-md-table-cell > strong").eq(1).text().trim()
				const Data = {
					author,
					ip: ip,
					port: port,
					versi: versi,
					player: player
				}
				hasil.push(Data)
			})
			resolve(hasil)
		}).catch(reject)
	})
}

// Mcpedl Search
async function mcpedl(query) {
	return new Promise((resolve, reject) => {
		axios.get(`https://mcpedl.com/?s=${query}`).then(async xzons => {
			const $ = cheerio.load(xzons.data)

			hasil = []

			$("div.post").each(function(c, d) {

				name = $(d).find("h2.post__title").text().trim();
				date = $(d).find("div.post__date").text().trim();
				desc = $(d).find("p.post__text").text().trim();
				category = $(d).find("div.post__category > a").text().trim();
				link = $(d).find("a").attr('href')
				link2 = `https://mcpedl.com${link}`
				const Data = {
					author,
					name: name,
					category: category,
					date: date,
					desc: desc,
					link: link2
				}
				hasil.push(Data)

			})
			resolve(hasil)
		}).catch(reject)
	});
}

// Youtube Downloader
async function youtube(link) {
	return new Promise((resolve, reject) => {
		const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
		if (ytIdRegex.test(link)) {
			let url = ytIdRegex.exec(link)
			let config = {
				'url': 'https://www.youtube.be/' + url,
				'q_auto': 0,
				'ajax': 1
			}
			let headerss = {
				"sec-ch-ua": '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				"Cookie": 'PHPSESSID=6jo2ggb63g5mjvgj45f612ogt7; _ga=GA1.2.405896420.1625200423; _gid=GA1.2.2135261581.1625200423; _PN_SBSCRBR_FALLBACK_DENIED=1625200785624; MarketGidStorage={"0":{},"C702514":{"page":5,"time":1625200846733}}'
			}
			axios('https://www.y2mate.com/mates/en68/analyze/ajax', {
					method: 'POST',
					data: new URLSearchParams(Object.entries(config)),
					headers: headerss
				})
				.then(({
					data
				}) => {
					const $ = cheerio.load(data.result)
					let img = $('div.thumbnail.cover > a > img').attr('src');
					let title = $('div.thumbnail.cover > div > b').text();
					let size = $('#mp4 > table > tbody > tr:nth-child(3) > td:nth-child(2)').text()
					let size_mp3 = $('#audio > table > tbody > tr:nth-child(1) > td:nth-child(2)').text()
					let id = /var k__id = "(.*?)"/.exec(data.result)[1]
					let configs = {
						type: 'youtube',
						_id: id,
						v_id: url[1],
						ajax: '1',
						token: '',
						ftype: 'mp4',
						fquality: 480
					}
					axios('https://www.y2mate.com/mates/en68/convert', {
							method: 'POST',
							data: new URLSearchParams(Object.entries(configs)),
							headers: headerss
						})
						.then(({
							data
						}) => {
							const $ = cheerio.load(data.result)
							let link = $('div > a').attr('href')
							let configss = {
								type: 'youtube',
								_id: id,
								v_id: url[1],
								ajax: '1',
								token: '',
								ftype: 'mp3',
								fquality: 128
							}
							axios('https://www.y2mate.com/mates/en68/convert', {
									method: 'POST',
									data: new URLSearchParams(Object.entries(configss)),
									headers: headerss
								})
								.then(({
									data
								}) => {
									const $ = cheerio.load(data.result)
									let audio = $('div > a').attr('href')
									resolve({
										id: url[1],
										title: title,
										size: size,
										quality: '480p',
										thumb: img,
										link: link,
										size_mp3: size_mp3,
										mp3: audio
									})
								})
						})
				})
				.catch(reject)
		} else reject('link invalid')
	})
}

// Pinterest
async function pinterest(querry) {
	return new Promise(async (resolve, reject) => {
		axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + querry, {
			headers: {
				"cookie": "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0"
			}
		}).then(({
			data
		}) => {
			const $ = cheerio.load(data)
			const result = [];
			const hasil = [];
			$('div > a').get().map(b => {
				const link = $(b).find('img').attr('src')
				result.push(link)
			});
			result.forEach(v => {
				if (v == undefined) return
				hasil.push(v.replace(/236/g, '736'))
			})
			hasil.shift();
			resolve(hasil)
		})
	})
}

// Happy Mod
async function happymod(query) {
	return new Promise((resolve, reject) => {
		axios.get(`https://www.happymod.com/search.html?q=${query}`).then(async tod => {
			const $ = cheerio.load(tod.data)

			hasil = []

			$("div.pdt-app-box").each(function(c, d) {


				name = $(d).find("a").text().trim();
				icon = $(d).find("img.lazy").attr('data-original');
				link = $(d).find("a").attr('href');
				link2 = `https://www.happymod.com${link}`
				const Data = {
					author,
					icon: icon,
					name: name,
					link: link2
				}
				hasil.push(Data)
			})
			resolve(hasil);
		}).catch(reject)
	});
}

// NickName Free Fire
async function nickff(userId) {
	if (!userId) return new Error("no userId")
	return new Promise((resolve, reject) => {
		let body = {
			"voucherPricePoint.id": 8050,
			"voucherPricePoint.price": "",
			"voucherPricePoint.variablePrice": "",
			"n": "",
			"email": "",
			"userVariablePrice": "",
			"order.data.profile": "",
			"user.userId": userId,
			"voucherTypeName": "FREEFIRE",
			"affiliateTrackingId": "",
			"impactClickId": "",
			"checkoutId": "",
			"tmwAccessToken": "",
			"shopLang": "in_ID"
		};
		axios({
			"url": "https://order.codashop.com/id/initPayment.action",
			"method": "POST",
			"data": body,
			"headers": {
				"Content-Type": "application/json; charset/utf-8",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
			}
		}).then(({
			data
		}) => {
			resolve({
				"username": data.confirmationFields.roles[0].role,
				"userId": userId,
				"country": data.confirmationFields.country
			});
		}).catch(reject);
	});
}

async function nickml(id, zoneId) {
	return new Promise(async (resolve, reject) => {
		axios
			.post(
				'https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store',
				new URLSearchParams(
					Object.entries({
						productId: '1',
						itemId: '2',
						catalogId: '57',
						paymentId: '352',
						gameId: id,
						zoneId: zoneId,
						product_ref: 'REG',
						product_ref_denom: 'AE',
					})
				), {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Referer: 'https://www.duniagames.co.id/',
						Accept: 'application/json',
					},
				}
			)
			.then((response) => {
				resolve(response.data.data.gameDetail)
			})
			.catch((err) => {
				reject(err)
			})
	})
}

// Sticker Search
async function StickerSearch(query) {
	return new Promise((resolve, reject) => {
		axios.get(`https://getstickerpack.com/stickers?query=${query}`)
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				const source = [];
				const link = [];
				$('#stickerPacks > div > div:nth-child(3) > div > a').each(function(a, b) {
					source.push($(b).attr('href'))
				})
				axios.get(source[Math.floor(Math.random() * source.length)])
					.then(({
						data
					}) => {
						const $$ = cheerio.load(data)
						$$('#stickerPack > div > div.row > div > img').each(function(c, d) {
							link.push($$(d).attr('src').replace(/&d=200x200/g, ''))
						})
						result = {
							status: 200,
							author: author,
							title: $$('#intro > div > div > h1').text(),
							sticker_url: link
						}
						resolve(result)
					})
			}).catch(reject)
	})
}

async function Telesticker(url) {
	return new Promise(async (resolve, reject) => {
		packName = url.replace("https://t.me/addstickers/", "")
		data = await axios(`https://api.telegram.org/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/getStickerSet?name=${encodeURIComponent(packName)}`, {
			method: "GET",
			headers: {
				"User-Agent": "GoogleBot"
			}
		})
		const hasil = []
		for (let i = 0; i < data.data.result.stickers.length; i++) {
			fileId = data.data.result.stickers[i].thumb.file_id
			data2 = await axios(`https://api.telegram.org/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/getFile?file_id=${fileId}`)
			result = {
				status: 200,
				author: author,
				url: "https://api.telegram.org/file/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/" + data2.data.result.file_path
			}
			hasil.push(result)
		}
		resolve(hasil)
	})
}

async function getToken(url) {
	const html = await fetch('https://downvideo.quora-wiki.com/tiktok-video-downloader#url=' + url)
	const $ = cheerio.load(await html.text())
	const token = $('#token').attr('value')
	return token
}
async function metaScrape(url) {
	return new Promise(async (resolve, reject) => {
		const token = await getToken(url)
		const data = await fetch('https://downvideo.quora-wiki.com/system/action.php', {
			method: 'POST',
			body: new URLSearchParams(
				Object.entries({
					url,
					token,
				})
			),
			headers: {
				Referer: 'https://downvideo.quora-wiki.com/tiktok-video-downloader',
			},
		})
		if (data.status !== 200) return reject(data.status)
		const json = await data.json()
		resolve(json)
	})
}

module.exports.aiovideodl = aiovideodl
module.exports.gtts = gtts
module.exports.happymod = happymod
module.exports.igdl = igdl
module.exports.igstalk = igstalk
module.exports.igstory = igstory
module.exports.linkwa = linkwa
module.exports.metaScrape = metaScrape
module.exports.mediafire = mediafire
module.exports.mcpedl = mcpedl
module.exports.nickff = nickff
module.exports.nickml = nickml
module.exports.playstore = playstore
module.exports.photooxy = photooxy
module.exports.pinterest = pinterest
module.exports.StickerSearch = StickerSearch
module.exports.servermc = servermc
module.exports.ttdownloader = ttdownloader
module.exports.Telesticker = Telesticker
module.exports.textpro = textpro
module.exports.youtube = youtube