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
const Box = styled.div`
  display: flex;
`

const BoxLable = styled.label``
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
          version?: string
          numberOfRecords?: string
          nextRecordPosition?: string
          extraResponseData?: string
          //eslint-disable-next-line
          records?: { record: Array<{ [key: string]: unknown }> } | string
          diagnostics?: { [key: string]: unknown }
        }
      }
    | { [key: string]: never }
  const [queryElement, setQueryElement] = useState({})

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

  const createURL = (queryElement: { [key: string]: string }) => {
    const url =
      'https://iss.ndl.go.jp/api/sru?operation=searchRetrieve&onlyBib=true&maximumRecords=10&recordSchema=dcndl_simple&recordPacking=xml&query=mediatype=1'
    let query = ''
    Object.keys(queryElement).forEach((key) => {
      if (queryElement[key] != '') {
        if (['title', 'creator', 'publisher'].includes(key)) {
          for (const q of queryElement[key].split(' ')) {
            if (q !== ' ') query += ` AND ${key}=${q}`
          }
        } else {
          let exp: RegExp
          if (['from', 'until'].includes(key)) exp = /^(\d{4}|\d{4}-\d{2}|\d{4}-\d{2}-\d{2})$/
          else exp = /^(\d{10}|\d{13})$/
          const m = queryElement[key].match(exp)
          if (!m) {
            console.log(`${key}でエラー`)
            return ''
          }
          query += ` AND ${key}=${m[0]}`
        }
      }
    })

    if (query === '') return ''
    console.log(url + encodeURI(query), query)
    return url + encodeURI(query)
  }

  const renameKey = (key: string) => {
    const match = key.match(/^\w+:(\w+)/)
    if (match) return match[1]
    return key
  }

  const convObj = (obj: { [key: string]: { [key: string]: string } | string }) => {
    //{$: {xsi:type: 'ISO639-2'}, _: "jpn"} を{ISO639-2:"jpn"}に変換
    if (
      typeof obj === 'object' &&
      '$' in obj &&
      '_' in obj &&
      typeof obj['_'] === 'string' &&
      typeof obj['$'] === 'object'
    ) {
      const ret: { [key: string]: string } = {}
      const key = renameKey(obj['$']['xsi:type'])
      ret[key] = obj['_']
      return ret
    }

    return obj
  }

  const wrapValue = (value: unknown) => {
    //引数の値が配列でなければ配列にして返す
    if (Array.isArray(value)) return value
    return [value]
  }

  const APIDataShaping = (
    records: { [key: string]: Array<{ [key: string]: unknown }> } | { [key: string]: unknown }
  ) => {
    const result = []
    for (const record of wrapValue(records)) {
      const newRecord: { [key: string]: { [key: string]: unknown } | Array<unknown> } = {}
      Object.keys(record.recordData['dcndl_simple:dc']).forEach((e) => {
        switch (e) {
          case '$':
          case 'rdfs:seeAlso':
            break

          default: {
            const key = renameKey(e)
            const values = record.recordData['dcndl_simple:dc'][e]

            if (Array.isArray(values) && typeof values !== 'string') {
              const newValueObj = {}
              const newValueArray = []
              for (const value of values) {
                if (typeof value === 'object') {
                  Object.assign(newValueObj, convObj(value))
                } else if (typeof value === 'string') {
                  newValueArray.push(value)
                }
              }
              if (newValueArray.length === 0) {
                newRecord[key] = newValueObj
              } else {
                if (Object.keys(newValueObj).length !== 0) {
                  //publicationPlace
                  newValueArray.push(newValueObj)
                }
                newRecord[key] = newValueArray
              }
            } else if (typeof values === 'object') {
              newRecord[key] = convObj(values)
            } else {
              newRecord[key] = values
            }
          }
        }
      })
      result.push(newRecord)
    }
    console.log(result)
  }

  const test = async (queryElement: { [key: string]: string }) => {
    let resData: responce = {}
    const url = createURL(queryElement)
    if (url === '') {
      console.log('要素を入力してください')
    } else {
      await fetchXml(url)
        .then((response) => {
          resData = response.data
        })
        .catch((e) => {
          console.error(e)
          resData = {}
        })
      console.log(resData)
      if ('searchRetrieveResponse' in resData) {
        const resDataSRR = resData['searchRetrieveResponse']
        if ('diagnostics' in resDataSRR) {
          console.log('検索中にエラーが発生しました。')
        } else if ('numberOfRecords' in resDataSRR && parseInt(resDataSRR['numberOfRecords']) < 1) {
          console.log('結果なし')
        } else {
          APIDataShaping(resDataSRR['records']['record'])
        }
      }
    }
  }

  const mokuzi = [
    ['タイトル', 'title'],
    ['著者', 'creator'],
    ['出版社', 'publisher'],
    ['開始出版年月日', 'from'],
    ['終了出版年月日', 'until'],
    ['ISBN', 'isbn'],
  ]
  return (
    <Container>
      {mokuzi.map((array, index) => (
        <Box key={index}>
          <BoxLable>{`${array[0]}：`}</BoxLable>
          <InputBox
            onChange={(e) => {
              setQueryElement((s) => ({ ...s, [array[1]]: e.target.value }))
            }}
          />
        </Box>
      ))}
      <B onClick={() => test(queryElement)} />
    </Container>
  )
}

export default Home
