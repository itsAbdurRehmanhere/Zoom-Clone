import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { fetchRoom } from "../rooms/roomsSlice";


export default function Room(){
  const {code} = useParams()
  const dispatch = useDispatch()
  const {current, status, error} = useSelector((state) => state.rooms)

  useEffect(() =>{
    dispatch(fetchRoom(code))
  }, [code, dispatch])

  if(status === 'loading') return <p className="p-6 text-white">Loading...</p>
  if(error){
    return(
      <div className="p-6 text-white">
        <p>{error}</p>
        <Link to="/" className="text-blue-400">Back to Dashboard</Link>
      </div>
    )
  }
  return <h1 className="p-6 text-2xl text-white">{current?.title}</h1>
}