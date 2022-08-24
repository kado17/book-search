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
      'https://iss.ndl.go.jp/api/sru?operation=searchRetrieve&onlyBib=true&maximumRecords=2&recordSchema=dcndl&recordPacking=xml'
    if (name != '') {
      url += `&query=${encodeURI(`title=${name} AND mediatype=1`)}`
    }
    console.log(url)
    return url
  }

  const test = async (n: string) => {
    let ret = {}
    await fetchXml(createURL(n))
      .then((response) => {
        ret = JSON.parse(JSON.stringify(response.data, null, 2))
      })
      .catch((e) => {
        console.error(e)
        ret = {}
      })
    console.log(ret)
    if ('searchRetrieveResponse' in ret) {
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
