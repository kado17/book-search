import axios from 'axios'
import xml2js from 'xml2js'
import type openBDRes from './openbd_responce_example.json'
type openBDRes = typeof openBDRes

type NDLBookDataValue =
  | string
  | Array<string | { [key: string]: string | { [key: string]: string } }>
  | { [key: string]: string | { [key: string]: string } }

type NDLrecordValue = {
  recordData: { 'dcndl_simple:dc': { [key: string]: NDLBookDataValue } }
  recordPacking: string
  recordPosition: string
  recordSchema: string
}

type NDLResUpstream = {
  searchRetrieveResponse: {
    $?: { [key: string]: string }
    version?: string
    numberOfRecords?: string
    nextRecordPosition?: string
    extraResponseData?: string
    records?: { record: NDLrecordValue[] } | string
    diagnostics?: { [key: string]: unknown }
  }
}

type organizedObj = {
  [key: string]:
    | string
    | { [key: string]: string | { [key: string]: string } }
    | Array<string | { [key: string]: string }>
}

const fetchNDLXml = async (url: string) => {
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

const renameNDLObjKey = (key: string) => {
  const match = key.match(/^\w+:(\w+)/)
  if (match) return match[1]
  return key
}

const organizingObjValue = (orgValue: { [key: string]: string | { [key: string]: string } }) => {
  //{$: {xsi:type: 'ISO639-2'}, _: "jpn"} を{ISO639-2:"jpn"}に変換
  if (
    '$' in orgValue &&
    '_' in orgValue &&
    typeof orgValue['_'] === 'string' &&
    typeof orgValue['$'] === 'object' &&
    'xsi:type' in orgValue['$']
  ) {
    const newObj: { [key: string]: string } = {}
    const key = renameNDLObjKey(orgValue['$']['xsi:type'])
    newObj[key] = orgValue['_']
    return newObj
  }
  return orgValue
}

const wrapValue = (value: object) => {
  //引数の値が配列でなければ配列にして返す
  if (Array.isArray(value)) return value
  return [value]
}

const NDLDataOrganizing = (records: NDLrecordValue[]): organizedObj[] => {
  const result: organizedObj[] = []
  for (const record of records) {
    const newRecord: organizedObj = {}
    Object.keys(record.recordData['dcndl_simple:dc']).forEach((e) => {
      switch (e) {
        case '$':
        case 'rdfs:seeAlso':
          break

        default: {
          const key = renameNDLObjKey(e)
          const values = record.recordData['dcndl_simple:dc'][e]
          if (Array.isArray(values) && typeof values !== 'string') {
            //valuesが配列であるとき(文字列ではない)
            const newValueArray = []
            const newValueObj: { [key: string]: string } = {}
            for (const value of values) {
              if (typeof value === 'object') {
                Object.assign(newValueObj, organizingObjValue(value))
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
            newRecord[key] = organizingObjValue(values)
          } else {
            newRecord[key] = values
          }
        }
      }
    })
    result.push(newRecord)
  }
  console.log('NDLDataShaping', result)
  return result
}

const fetchOpenBD = async (isbn: string) => {
  const url = `https://api.openbd.jp/v1/get?isbn=${isbn}`
  console.log(url)
  return await axios.get(url)
}

const convBookData = async (records: organizedObj[]) => {
  console.log(records)
  const result = []
  for (const record of records) {
    const item: { [key: string]: string } = {
      title: '',
      creator: '',
      publisher: '',
      cover: '',
      textContent: '',
    }
    if (
      'identifier' in record &&
      typeof record['identifier'] === 'object' &&
      'ISBN' in record['identifier']
    ) {
      const resOpenBD: openBDRes | { [key: string]: never } = await fetchOpenBD(
        String(record['identifier']['ISBN'])
      )
        .then((response) => {
          if (response.data[0] !== null) return response.data[0]
          return {}
        })
        .catch((e) => {
          console.error(e)
          return {}
        })

      if (Object.keys(resOpenBD).length !== 0) {
        item['title'] = resOpenBD['summary']['title']
        item['creator'] = resOpenBD['summary']['author']
        item['publisher'] = resOpenBD['summary']['publisher']
        item['cover'] = resOpenBD['summary']['cover']
        if ('TextContent' in resOpenBD['onix']['CollateralDetail'])
          item['textContent'] = resOpenBD['onix']['CollateralDetail']['TextContent'][0]['Text']
        result.push(item)
        continue
      }
    }
    //普通に代入
    for (const key of ['title', 'creator', 'publisher']) {
      if (key in record) {
        const value = record[key]
        if (Array.isArray(value)) {
          item[key] = String(value[0])
        } else item[key] = String(value)
      }
    }
    result.push(item)
  }
  console.log('convBookData', result)
  return result
}

const geneNDLAccessURL = (queryElement: { [key: string]: string }): string => {
  const url =
    'https://iss.ndl.go.jp/api/sru?operation=searchRetrieve&onlyBib=true&maximumRecords=10&recordSchema=dcndl_simple&recordPacking=xml&query=mediatype=1 AND dpid=iss-ndl-opac'
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
  console.log(encodeURI(url + query), query)
  return encodeURI(url + query)
}

export const getBookData = async (queryElement: { [key: string]: string }) => {
  let resData: NDLResUpstream | { [key: string]: never } = {}
  const url = geneNDLAccessURL(queryElement)
  if (url === '') {
    console.log('要素を入力してください')
  } else {
    await fetchNDLXml(url)
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
        console.log('引数', resDataSRR['records']['record'])
        const ndlResult = NDLDataOrganizing(wrapValue(resDataSRR['records']['record']))
        const csResult = await convBookData(ndlResult)
        console.log('RESULT', csResult)
        return csResult
      }
    }
  }
}
