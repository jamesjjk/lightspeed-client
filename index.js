'use strict'

const fetch = require('isomorphic-fetch')
const boom = require('boom')
const auth = require('basic-auth-header')
const qs = require('querystring')



const base = 'https://api.webshopapp.com/'

const onError = (res) => new Promise((yay, nay) => {
	const contentType = res.headers.get('content-type')
	if (!contentType || contentType.slice(0, 16) !== 'application/json')
		return nay(boom.create(res.status, res.statusText))

	res.json()
	.then((body) => {
		if (body.error) nay(boom.create(res.status, body.error.message))
		throw new Error('') // pass on to catcher
	})
	.catch(() => nay(boom.create(res.status, res.statusText)))
})

const request = (key, secret, lang) => (method, endpoint, data = {}) => {
	method = method.toUpperCase()
	let url = base + lang + '/' + endpoint
	const req = {
		method, headers: {Authorization: auth(key, secret)},
		mode: 'cors', redirect: 'follow',
		cache: 'no-store', referrer: 'no-referrer'
	}

	if (data) {
		if (method === 'GET')
			url += '?' + qs.stringify(data)
		else if (method === 'PUT' || method === 'POST') {
			req.body = JSON.stringify(data)
			req.headers['Content-Type'] = 'application/json'
		}
	}

	return fetch(url, req)
	.then((res) => {
		if (res.ok) return res.json()
		return onError(res)
	})
}



const client = (key, secret, lang) => {
	if ('string' !== typeof key) throw new Error('API key must be a string.')
	if ('string' !== typeof secret) throw new Error('API secret must be a string.')
	if ('string' !== typeof lang) throw new Error('Language must be a string.')

	const fetch= request(key, secret, lang)

	const resource = (route, ns) => {
		const res = (plural) => (d) => plural ? d[ns + 's'] : d[ns]
		const req = (d) => ({[ns]: d})

		return {
			  get: (id, d) =>
				fetch('GET', route + (id ? '/' + id : '') + '.json', d)
				.then(res(!id))
			, put: (id, d) =>
				fetch('PUT', route + '/' + id + '.json', req(d))
				.then(res(false))
			, delete: (id) =>
				fetch('DELETE', route + '/' + id + '.json')
				.then(() => null)
			, post: (d) =>
				fetch('POST', route + '.json', req(d))
				.then(res(false))
		}
	}

	return resource
}

module.exports = client
