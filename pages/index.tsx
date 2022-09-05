import type { NextPage } from 'next'
import { useState } from 'react'
import styled from 'styled-components'
import Img from '../public/gray.jpg'
import * as fetchApi from '../src/fetch_and_data_organizing'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 0.5rem;
  background-color: gray;
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
const Frame = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 75%;
`

const ItemContainer = styled.div`
  display: flex;
  width: 50%;
  background-color: white;
  border: 1vh solid black;

  img {
    width: auto;
    height: 100%;
  }
`
const ItemTextContainer = styled.div`
  margin-right: 5%;
  margin-left: 5%;
`

const Home: NextPage = () => {
  const [queryElement, setQueryElement] = useState({})
  const [searchResult, setSearchResult] = useState<
    { [key: string]: string }[] | string | undefined
  >('')

  const mokuzi = [
    ['タイトル', 'title'],
    ['著者', 'creator'],
    ['出版社', 'publisher'],
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
      <B
        onClick={() => {
          fetchApi.getBookData(queryElement).then((res) => {
            console.log(Img)
            setSearchResult(res)
          })
        }}
      />
      {typeof searchResult === 'string' || searchResult === undefined ? (
        ''
      ) : (
        <Frame>
          {searchResult.map((obj: { [key: string]: string }, index: number) => (
            <ItemContainer key={index}>
              <img src={obj.cover !== '' ? obj.cover : Img.src} alt="img" />
              <ItemTextContainer>
                <h2>{obj.title}</h2>
                <p>{obj.textContent}</p>
                <p>{obj.creator}</p>
                <p>{obj.publisher}</p>
                <p>{obj.issued}</p>
              </ItemTextContainer>
            </ItemContainer>
          ))}
        </Frame>
      )}
    </Container>
  )
}

export default Home
