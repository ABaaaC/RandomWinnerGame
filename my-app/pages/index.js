import Head from 'next/head'
// import Image from 'next/image'
import styles from '@/styles/Home.module.css'
import React, { useEffect, useRef, useState } from "react"

import { utils, BigNumber, providers, ethers } from "ethers"
import Web3Modal from "web3modal"
import {
  RANDOM_GAME_NFT_CONTRACT_ADDRESS,
  RANDOM_GAME_NFT_CONTRACT_ABI
} from '../constants'
import { FETCH_CREATED_GAME } from "../queries";
import { subgraphQuery } from "../utils";


export default function Home() {

  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const zero = BigNumber.from(0);

  const [maxPlayers, setMaxPlayers] = useState(0);
  const [entryFee, setEntryFee] = useState(zero);

  // Checks if a game started or not
  const [gameStarted, setGameStarted] = useState(false);
  // Players that joined the game
  const [players, setPlayers] = useState([]);
  // Winner of the game
  const [winner, setWinner] = useState();
  // Keep a track of all the logs for a given game
  const [logs, setLogs] = useState([]);


  const web3ModalRef = useRef();

  // This is used to force react to re render the page when we want to
  // in our case we will use force update to show new logs
  const forceUpdate = React.useReducer(() => ({}), {})[1];

  const getOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true);

      const randomGameNFTContract = new ethers.Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        RANDOM_GAME_NFT_CONTRACT_ABI,
        signer
      )

      const owner = await randomGameNFTContract.owner();
      const userAddress = await signer.getAddress();

      if (owner.toLowerCase() == userAddress.toLowerCase()) {
        setIsOwner(true);
      }

    } catch (error) {
      console.error(error);
    }
  }

  /**
   * startGame: Is called by the owner to start the game
   */

  const startGame = async () => {
    try {
      const signer = await getProviderOrSigner(true);

      const randomGameNFTContract = new ethers.Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        RANDOM_GAME_NFT_CONTRACT_ABI,
        signer
      )

      setLoading(true);
      const tx = await randomGameNFTContract.startGame(maxPlayers, entryFee);
      await tx.wait();
      setLoading(false);

    } catch (error) {
      console.error(error.message);
    }
  }

  /**
   * joinGame: Is called by a player to join the game
   */

  const joinGame = async () => {
    try {
      const signer = await getProviderOrSigner(true);

      const randomGameNFTContract = new ethers.Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        RANDOM_GAME_NFT_CONTRACT_ABI,
        signer
      )

      setLoading(true);
      const tx = await randomGameNFTContract.joinGame({ value: entryFee });
      await tx.wait();
      setLoading(false);

    } catch (error) {
      console.error(error.message);
    }
  }

  /**
   * checkIfGameStarted checks if the game has started or not and intializes the logs
   * for the game
   */

  const checkIfGameStarted = async () => {
    try {
      const provider = await getProviderOrSigner();

      const randomGameNFTContract = new ethers.Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        RANDOM_GAME_NFT_CONTRACT_ABI,
        provider
      )

      // read the gameStarted boolean from the contract
      const _gameStarted = await randomGameNFTContract.gameStarted();
      const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
      const _game = _gameArray.games[0];

      // console.log('_gs', _gameStarted);
      // console.log('gs', gameStarted);      
      // console.log('fee', entryFee);
      // console.log('max', maxPlayers);
      // console.log('_gm', _game);

      let _logs = [];
      // Initialize the logs array and query the graph for current gameID
      if (_gameStarted) {
        _logs = [`Game has started with ID: ${_game.id}`];
        if (_game.players && _game.players.length > 0) {
          _logs.push(`${_game.players.length} / ${_game.maxPlayers} already joined 👀 `)
        }
        _game.players.forEach((player) => {
          _logs.push(`${player} joined 🏃‍♂️`)
        })
        setEntryFee(BigNumber.from(_game.entryFee));
        setMaxPlayers(_game.maxPlayers);

      } else if (!gameStarted && _game.winner) {
        _logs = [
          `Last game has ended with ID: ${_game.id}`,
          `Winner is: ${_game.winner} 🎉 `,
          `Waiting for host to start new game....`,
        ];

        setWinner(_game.winner);
      }
      setLogs(_logs);
      setPlayers(_game.players);
      setGameStarted(_gameStarted);
      forceUpdate();

    } catch (error) {
      console.error(error.message);
    }
  }

  /**
   * connectWallet: Connects the MetaMask wallet
   */

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  }

  /**
 * Returns a Provider or Signer object representing the Ethereum RPC with or
 * without the signing capabilities of Metamask attached
 *
 * A `Provider` is needed to interact with the blockchain - reading
 * transactions, reading balances, reading state, etc.
 *
 * A `Signer` is a special type of Provider used in case a `write` transaction
 * needs to be made to the blockchain, which involves the connected account
 * needing to make a digital signature to authorize the transaction being
 * sent. Metamask exposes a Signer API to allow your website to request
 * signatures from the user using Signer functions.
 *
 * @param {*} needSigner - True if you need the signer, default false
 * otherwise
 */

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 80001) {
      window.alert("Please, change the network to the Mumbai!" + chainId);
      throw new Error("Incorrect network: " + chainId);
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }


  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {},
        disableInjectedProvider: false
      })
    } else {
      getOwner();
      checkIfGameStarted();
      setInterval(() => {
        checkIfGameStarted();
      }, 10_000);
    }

  }, [walletConnected]);


  /*
    renderButton: Returns a button based on the state of the dapp
*/

  function renderConnectButton() {
    if (!walletConnected) {
      return (
        <div>
          <div>
            <button className={styles.button} onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        </div>
      )
    }
  }

  function renderLottery() {
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // Render when the game has started
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button className={styles.button} disabled>
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button className={styles.button} onClick={joinGame}>
            Join Game 🚀
          </button>
        </div>
      );
    }
    // Start the game
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setEntryFee(
                e.target.value >= 0
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (MATIC)"
          />

          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setMaxPlayers(e.target.value ?? 0);
            }}
            placeholder="Max Players"
          />

          <button className={styles.button} onClick={startGame}>
            Start Game 🚀
          </button>
        </div>
      )
    }

  }

  return (
    <div>
      <Head>
        <title>
          Random Winner Game
        </title>
        <meta name="description" content="Random Winner Game" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <div>
            <h1 className={styles.title}>
              Welcome to the Lottery!
            </h1>

          </div>

          <div className={styles.description}>
            It is a lottery game where a winner is chosen at random and wins the
            entire lottery pool
            <br />
            <br />
            OR
            <br />
            <br />
            The place where you challenge your Luck!

          </div>

          {walletConnected ? renderLottery() : renderConnectButton()}
          {/* {walletConnected} */}
          <div>

            {logs &&
              logs.map((log, index) => (
                <div className={styles.log} key={index}>
                  {log}
                </div>
              ))}

          </div>

        </div>

        <div>
          <img className={styles.image} src='/randomWinner.png' />
        </div>

      </div>



      <footer className={styles.footer}>
        From ABaaaC with &#10084;
      </footer>
    </div>
  )
}
