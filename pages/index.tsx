import axios from 'axios'
import type { NextPage } from 'next'
import { useState } from 'react'
import styled from 'styled-components'
import xml2js from 'xml2js'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  min-height: 100vh;
  padding: 0 0.5rem;
`

const InputBox = styled.input.attrs(() => ({ type: 'text' }))``
const B = styled.button`
  width: 10vh;
  height: 5vh;
`
const Home: NextPage = () => {
  type responce =
    | {
        searchRetrieveResponse: {
          $?: { [key: string]: string }
          version: string
          numberOfRecords: string
          nextRecordPosition: string
          extraResponseData?: string
          //eslint-disable-next-line
          records: { record: Array<Object> }
        }
      }
    | { [key: string]: never }
  const [text, sText] = useState('')

  const fetchXml = async (url: string) => {
    const config = {
      // responseType: 'document', 'document'はブラウザ環境以外ではtextと同じ
      transformResponse: [
        (data: string) => {
          let jsonData
          const parser = new xml2js.Parser({
            async: false,
            explicitArray: false,
          })
          parser.parseString(data, (error, json) => {
            jsonData = json
          })
          return jsonData
        },
      ],
    }
    return await axios.get(url, config)
  }

  const createURL = (name: string) => {
    let url =
      'https://iss.ndl.go.jp/api/sru?operation=searchRetrieve&onlyBib=true&maximumRecords=10&recordSchema=dcndl_simple&recordPacking=xml'
    if (name != '') {
      url += `&query=${encodeURI(`title=${name} AND mediatype=1`)}`
    }
    console.log(url)
    return url
  }

  const c2 = (obj: { [key: string]: string }) => {
    console.log('c2', obj)
    const ret = {}

    if (typeof obj === 'object' && '$' in obj && '_' in obj) {
      ret[obj['$']['xsi:type']] = obj['_']
      console.log('exe', ret)
      return ret
    }

    return obj
  }

  //eslint-disable-next-line
  const clean = (records: { [key: string]: Array<{ [key: string]: string }> }) => {
    const result = []
    for (const r of records.record) {
      const t: { [key: string]: string } = {}
      console.log(r)
      Object.keys(r.recordData['dcndl_simple:dc']).forEach((e) => {
        switch (e) {
          case '$':
          case '_':
            t[e] = r.recordData['dcndl_simple:dc'][e]
            break

          default: {
            let tmp = e
            const value = r.recordData['dcndl_simple:dc'][e]
            const m = e.match(/^\w+:(\w+)/)
            if (m) {
              tmp = m[1]
            }

            if (Array.isArray(value) && typeof value !== 'string') {
              const ret = {}
              const re = []
              for (const ll of value) {
                if (typeof ll === 'object') {
                  Object.assign(ret, c2(ll))
                  console.log('c2log', c2(ll), ret)
                } else if (typeof ll === 'string') {
                  re.push(ll)
                }
              }
              if (re.length === 0) {
                console.log('ret', ret)
                t[tmp] = ret
              } else {
                if (Object.keys(ret).length !== 0) {
                  re.push(ret)
                }
                t[tmp] = re
              }
            } else if (typeof value === 'object') {
              t[tmp] = c2(value)
            } else {
              t[tmp] = r.recordData['dcndl_simple:dc'][e]
            }
          }
        }
      })
      result.push(t)
    }
    console.log(result)
  }

  const test = async (n: string) => {
    let ret: responce = {}
    await fetchXml(createURL(n))
      .then((response) => {
        ret = response.data
      })
      .catch((e) => {
        console.error(e)
        ret = {}
      })
    console.log(ret)
    if (Object.hasOwnProperty.call(ret, 'searchRetrieveResponse')) {
      clean(ret['searchRetrieveResponse']['records'])
      console.log('!')
    }
  }
  return (
    <Container>
      <InputBox
        onChange={(e) => {
          sText(e.target.value)
        }}
      />
      <B onClick={() => test(text)} />
    </Container>
  )
}

export default Home
