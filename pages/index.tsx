import type { NextPage } from 'next'
import { useState } from 'react'
import styled from 'styled-components'
import * as fetchApi from '../src/fetch_and_data_organizing'

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
  const [queryElement, setQueryElement] = useState({})

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
      <B onClick={() => fetchApi.getBookData(queryElement)} />
    </Container>
  )
}

export default Home
