**A transformer is a specific type of neural network architecture, meaning all transformers are neural networks, but not all neural networks are transformers**

A **transformer** is an advanced, specialized blueprint designed specifically to handle sequential data like text.

![[Pasted image 20260801084538.png]]

So basically it is a specialized specific architecture/blueprint for Neural Network used accomplish very specific task

A **GPT model** can be thought of as a specific, trained instance of the **Transformer** architecture

#### What happens inside a transformer

Essentially what ChatGPT does is that it first takes a sample input and then predicts the next best possible word appends the word to original and then use this new sentence and does the same thing again and again.

#### Token

Whatever input that is provided gets broken down into pieces, for text it can words or collection of symbols, for images chunk of smaller images, etc. and these small chunks are called **tokens**.

#### Embeddings

Each of these tokens is associated or gets mapped to a vector (for encoding) , words with similar meaning tends to land on vectors that are close each other.
These vector belong in a very high dimensional space.

#### Attention

These embeddings go through an `Attention` block and this block allows vectors to talk to each other and update their values. 
![[Pasted image 20260801165127.png]]

For e.g. the meaning of word `model` in "A machine learning model" is very different from "A fashion model". **The attention block is what's responsible for figuring out which words in context are relevant to updating the meanings of which other words, and how exactly those meanings should be updated**. And thus attention block help in accurate the values of embeddings wrt context

After attention block these vectors/embeddings go through a diff kind of operation feed forward layer or multi-layer-perceptron (in this the vectors don't talk to each other but goes through same operations)

And after this the process basically repeats. Until the last vector is meaningful which is extracted its 'word' value is decoded and appended to original sentence and this new sentence acts as input and process repeats.

And basically this is what happens inside a transformer at a high level.

So basically inside a tool like ChatGPT whats mostly happening is matrix multiplication. 

The weights of the model (the weights inside nodes/neurons which in turn is inside layers which together with all layer for NN) is the actual brain of that model which is optimized by training.

#### Word Embeddings 

The model has a pre-defined vocabulary of words (say 50,000) and the first matrix that we'll encounter, known as the embedding matrix, has a single column for each one of these words.
![[Pasted image 20260801173341.png]]
These columns are what determines what vector each word turns into in that first step.

`Note - The dot product of 2 vectors can be thought of as a measure of how well they align (+ve if in same dir, -ve if opp and zero if perpendicular`

Just think yourself when you see a word the meaning or essence or importance of that word is defined by the context it is in i.e. surrounding words, sentences and paragraphs a transformer (via attention and feed forward layer is doing the same thing) making sense of the those words.

#### Context Window

This network can only process a **fixed number of vectors at a time known as context window**.
![[Pasted image 20260801175132.png]]


#### Unembedding Matrix
![[Pasted image 20260801175458.png]]

#### Summary

![[Pasted image 20260801180450.png]]