# Algorithm Design

The Transformer architecture, originally introduced by Vaswani et al. (2017), is a deep learning model that relies entirely on attention mechanisms to capture dependencies in sequential data. Unlike traditional recurrent neural networks (RNNs) that process sequences sequentially, Transformers process all positions in parallel using self-attention mechanisms, making them highly efficient and capable of capturing long-range dependencies in temporal sequences.

In the context of the Real-Time Physiotherapy Motion Recognition System, a Transformer-based model is employed for activity classification, which identifies the type of exercise movement being performed by the patient in real-time. The input to the Transformer model consists of sequences of pose landmarks extracted from video frames using MediaPipe Pose estimation.

## Model Architecture

The Transformer model processes temporal sequences of pose landmarks to classify the activity being performed. The first step involves extracting 33 anatomical landmark points from each video frame using MediaPipe Pose, where each landmark consists of x, y, z coordinates and a visibility score. These landmarks are organized into a sliding window of fixed frame size (denoted as N), creating input sequences of shape [N, 33, 4], where N represents the number of frames in the temporal window, 33 represents the number of anatomical landmarks, and 4 represents the features per landmark (x, y, z, visibility).

The input tensor is then reshaped to [1, N, F, 1] where F represents the total number of features (N × 33 × 4 = 132 features when flattened, or a reduced feature dimension). This reshaped tensor serves as the input to the Transformer model.

## Transformer Block Components

The core component of the Transformer model is the Transformer Block, which consists of several key sub-components:

### 1. Multi-Head Self-Attention

The Multi-Head Attention mechanism allows the model to attend to different parts of the input sequence simultaneously. In self-attention, the model computes attention scores between all pairs of positions in the input sequence. The attention mechanism uses Query (Q), Key (K), and Value (V) matrices derived from the input, where:

- **Query (Q)**: Represents what the model is looking for at each position
- **Key (K)**: Represents what information is available at each position
- **Value (V)**: Contains the actual content at each position

The attention scores are computed using the scaled dot-product attention formula:

**Attention(Q, K, V) = softmax(QK^T / √d_k) V**

where d_k is the dimension of the key vectors. The scaling factor √d_k prevents the dot products from growing too large, which could cause vanishing gradients in the softmax function. Multi-head attention performs this operation multiple times (num_heads times) in parallel, with each head potentially learning to attend to different aspects of the temporal relationships.

### 2. Position-wise Feed-Forward Network

After the attention mechanism, the output passes through a position-wise feed-forward network (FFN). This consists of two linear transformations with a ReLU activation in between:

**FFN(x) = max(0, xW₁ + b₁)W₂ + b₂**

The FFN is applied independently to each position, allowing the model to transform the attended representations non-linearly. This helps capture complex patterns in the pose sequences that cannot be captured by attention alone.

### 3. Layer Normalization and Residual Connections

Each Transformer Block incorporates layer normalization and residual connections to stabilize training and facilitate gradient flow. The layer normalization is applied before the attention mechanism (pre-norm architecture) or after (post-norm), helping normalize the activations and reducing internal covariate shift. Residual connections allow gradients to flow directly through the network, enabling the training of deeper models.

The complete Transformer Block computation can be summarized as:

**Block(x) = LayerNorm(x + FFN(LayerNorm(x + Attention(x))))**

## Model Output and Classification

The Transformer model processes the input sequence through multiple stacked Transformer Blocks, each with configurable dimensions including:
- **embed_dim**: The dimensionality of the embedding space
- **num_heads**: The number of parallel attention heads
- **ff_dim**: The dimensionality of the feed-forward network's hidden layer
- **rate**: The dropout rate for regularization

After processing through all Transformer Blocks, the output is passed through a classification head, typically consisting of global pooling or a final dense layer, followed by a softmax activation function. This produces a probability distribution over the set of possible activities, where each activity represents a different type of exercise movement (e.g., squats, shoulder abduction, elbow flexion, etc.).

The predicted activity is determined by selecting the class with the highest probability:

**predicted_activity = argmax(softmax(Transformer_output))**

The confidence score for the prediction is given by the maximum probability value, indicating how certain the model is about its classification.

## Temporal Sequence Processing

The Transformer model leverages its ability to process entire sequences in parallel to capture temporal dependencies in the pose landmark sequences. Unlike recurrent models that process frames sequentially, the self-attention mechanism allows the model to directly attend to relevant frames anywhere in the temporal window, making it effective at recognizing patterns that span multiple frames, such as the distinct phases of an exercise movement (starting position, movement phase, and return phase).


