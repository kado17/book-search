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
const Home: NextPage = () => {
  const [s, setS] = useState('')

  const fetchXml = async () => {
    const config = {
      // responseType: 'document', 'document'はブラウザ環境以外ではtextと同じ
      transformResponse: [
        (data: any) => {
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
    return await axios.get(
      'https://iss.ndl.go.jp/api/sru?operation=searchRetrieve&onlyBib=true&maximumRecords=16&recordSchema=dcndl&recordPacking=xml&query=title=%22%E6%A1%9C%22%20AND%20from=%222018%22',
      config
    )
  }

  const test = async () => {
    let ret = ''
    await fetchXml()
      .then((response) => {
        ret = JSON.stringify(response.data, null, 2)
      })
      .catch((e) => {
        console.error(e)
        ret = 'ERROR'
      })
    setS(ret)
  }
  test()
  return (
    <Container>
      <p>{s}</p>
    </Container>
  )
}

export default Home
